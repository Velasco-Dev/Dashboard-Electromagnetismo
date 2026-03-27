// backend/mqtt/mqttClient.js
// Cliente MQTT para suscribirse a datos solares

const mqtt = require('mqtt');
const Measurement = require('../models/Measurement');

const MQTT_BROKER = process.env.MQTT_BROKER || 'wss://broker.hivemq.com:8884/mqtt';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'solar/data';

class MQTTClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      // Timeout de 10 segundos para intentar conectar
      const connectionTimeout = setTimeout(() => {
        console.warn('⚠️ MQTT: Timeout en conexión. Continuando sin MQTT por ahora...');
        console.log('📌 El servidor REST funcionará normalmente. MQTT se reconectará automáticamente.');
        resolve(); // Resolver sin error para permitir que el servidor continúe
      }, 10000);

      this.client = mqtt.connect(MQTT_BROKER, {
        protocol: 'wss',
        connectTimeout: 8000,
        reconnectPeriod: 5000, // Reintentar cada 5 segundos
        clientId: 'solar_backend_' + Math.random().toString(16).substr(2, 8),
        clean: true,
        keepalive: 60,
        rejectUnauthorized: false // Para brokers con certificados autofirmados
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
      
      // Mapear los nombres del ESP32 (camelCase) a los nombres del Backend (snake_case)
      const mappedData = {
        panel_voltage: data.panelVoltage || 0,
        panel_current: data.panelCurrent || 0,
        battery_voltage: data.batteryVoltage || 0,
        battery_current: data.batteryCurrent || 0,
        load_current: data.loadCurrent || 0,
        power: data.panelPower || 0,
        measurement_id: data.timestamp || 0, // Usamos el timestamp como ID si no hay uno
        timestamp: Math.floor(Date.now() / 1000)
      };

      // Guardar en MongoDB usando el mapeo correcto
      const result = await Measurement.create(mappedData);
      console.log(`💾 Guardado en MongoDB:`, {
        voltaje_panel: mappedData.panel_voltage,
        potencia: mappedData.power,
        timestamp: new Date().toLocaleTimeString()
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
