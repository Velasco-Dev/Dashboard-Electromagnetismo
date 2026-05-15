// backend/mqtt/mqttClient.js
// Cliente MQTT para suscribirse a datos 

const mqtt = require('mqtt');
const Measurement = require('../models/Measurement');

// Broker privado HiveMQ Cloud (mismo que usa el Dashboard y el ESP32)
const MQTT_BROKER = process.env.MQTT_BROKER || 'wss://81f19fbf222f43c9a70f4d8fbf68f0f1.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'solar/data';
const MQTT_USER = process.env.MQTT_USER || 'alvarolpz43';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '12345678Aj';

class MQTTClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }


  connect() {
    return new Promise((resolve, reject) => {
      // Timeout de 10 segundos para intentar conectar
      const connectionTimeout = setTimeout(() => {
        console.warn('⚠️ MQTT: Timeout en cone. Continuando sin MQTT por ahora...');
        console.log('📌 El servidor REST funcionará normalmente. MQTT se reconectará automáticamente.');
        resolve(); // Resolver sin error para permitir que el servidor continúe
      }, 10000);

      this.client = mqtt.connect(MQTT_BROKER, {
        protocol: 'wss',
        connectTimeout: 8000,
        reconnectPeriod: 5000,
        clientId: 'solar_backend_' + Math.random().toString(16).substr(2, 8),
        clean: true,
        keepalive: 60,
        username: MQTT_USER,
        password: MQTT_PASSWORD,
        rejectUnauthorized: false
      });

      this.client.on('connect', () => {
        clearTimeout(connectionTimeout);
        console.log('✅ Conectado a MQTT');
        this.isConnected = true;

        this.client.subscribe(MQTT_TOPIC, { qos: 1 }, (err) => {
          if (err) {
            console.error('❌ Error al suscribirse:', err);
          } else {
            console.log(`🟢 Suscrito a topic: ${MQTT_TOPIC}`);
          }
        });
      });

      this.client.on('reconnect', () => {
        console.log('🔄 Intentando reconectar a MQTT...');
      });

      this.client.on('disconnect', () => {
        console.log('🔌 Desconectado de MQTT');
        this.isConnected = false;
      });

      this.client.on('error', (err) => {
        console.warn('⚠️ Error MQTT:', err.message);
        this.isConnected = false;
      });

      this.client.on('message', this.handleMessage.bind(this));
    });
  }

  async handleMessage(topic, message) {
    try {
      // Solo procesar mensajes del topic solar/data
      if (topic !== MQTT_TOPIC) {
        return;
      }

      let messageStr = message.toString();

      // Aplicar la misma limpieza que en el Frontend para evitar errores de JSON (NaNs)
      messageStr = messageStr.replace(/:nan/gi, ':0')
        .replace(/:nan,/gi, ':0,')
        .replace(/,nan/gi, ',0');

      messageStr = messageStr.replace(/:\s*,/g, ':0,')
        .replace(/:\s*\}/g, ':0}');

      // Validar que sea JSON válido antes de parsear
      if (!messageStr.trim().startsWith('{')) {
        console.warn(`⚠️ Mensaje no es JSON válido en topic ${topic}`);
        return;
      }

      const data = JSON.parse(messageStr);

      const panelVoltage = Number(data.panel_voltage) || 0;
      const panelCurrent = Number(data.panel_current) || 0;
      const batteryVoltage = Number(data.battery_voltage) || 0;
      const batteryCurrent = Number(data.battery_current) || 0;
      const loadVoltage = Number(data.load_voltage) || 0;
      const loadCurrent = Number(data.load_current) || 0;

      const panelPower = Number(data.panel_power ?? (panelVoltage * panelCurrent)) || 0;
      const batteryPower = Number(data.battery_power ?? (batteryVoltage * batteryCurrent)) || 0;
      const computedLoadPower = loadVoltage > 0
        ? loadVoltage * loadCurrent
        : batteryVoltage * loadCurrent;
      const loadPower = Number(data.load_power ?? computedLoadPower) || 0;

      const totalPower = Number(data.power ?? data.panelPower ?? panelPower) || 0;

      // Mapear los nombres del ESP32 (camelCase) a los nombres en español del Backend
      const mappedData = {
        voltaje_panel: panelVoltage,
        corriente_panel: panelCurrent,
        voltaje_bateria: batteryVoltage,
        corriente_bateria: batteryCurrent,
        voltaje_carga: loadVoltage,
        corriente_carga: loadCurrent,
        potencia_panel: panelPower,
        potencia_bateria: batteryPower,
        potencia_carga: loadPower,
        potencia: totalPower,
        marca_tiempo: data.timestamp || Math.floor(Date.now() / 1000)
      };

      // Llamar al controlador para guardar los datos
      const result = await require('../controllers/measurementController').saveMeasurement(mappedData);
      console.log(`💾 Guardado en MongoDB:`, {
        voltaje_panel: mappedData.voltaje_panel,
        potencia: mappedData.potencia,
        marca_tiempo: new Date(mappedData.marca_tiempo * 1000).toLocaleTimeString()
      });
    } catch (err) {
      console.error('❌ Error al procesar/guardar mensaje:', err.message);
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
      console.log('🔌 Desconectado de MQTT');
    }
  }
}

module.exports = new MQTTClient();
