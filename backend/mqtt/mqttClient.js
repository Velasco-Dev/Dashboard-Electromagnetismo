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
        console.log(`⏭️ Ignorando mensaje del topic: ${topic}`);
        return;
      }

      const messageStr = message.toString();
      
      // Validar que sea JSON válido
      if (!messageStr.trim().startsWith('{')) {
        console.warn(`⚠️ Mensaje no es JSON válido en topic ${topic}:`, messageStr.substring(0, 50));
        return;
      }

      const data = JSON.parse(messageStr);
      
      // Guardar en MongoDB
      const result = await Measurement.create(data);
      console.log(`💾 Guardado en MongoDB (ID: ${result.insertedId}):`, {
        panel_voltage: data.panel_voltage,
        panel_current: data.panel_current,
        battery_voltage: data.battery_voltage,
        power: data.power
      });
    } catch (err) {
      console.error('❌ Error al procesar mensaje:', err.message);
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
