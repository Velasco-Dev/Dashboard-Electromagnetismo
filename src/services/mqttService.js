/**
 * Servicio MQTT para conectar con el broker HiveMQ
 * Maneja la conexión, suscripción y recepción de datos IoT
 * @author Sistema IoT Fotovoltaico
 */

import mqtt from 'mqtt';

class MqttService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = new Map();
    
    // Configuración del broker MQTT
    this.config = {
      broker: 'wss://broker.hivemq.com:8884/mqtt',
      options: {
        clientId: `solar_dashboard_${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
        keepalive: 60,
        username: undefined, // HiveMQ público no requiere autenticación
        password: undefined,
        will: {
          topic: 'solar/status',
          payload: JSON.stringify({ 
            client: 'dashboard', 
            status: 'offline',
            timestamp: Date.now()
          }),
          qos: 1,
          retain: false
        }
      },
      topics: {
        solarData: 'solar/data',
        solarStatus: 'solar/status'
      }
    };
  }

  /**
   * Inicializa la conexión MQTT
   */
  async connect() {
    try {
      console.log('🔌 Conectando al broker MQTT...', this.config.broker);
      
      this.client = mqtt.connect(this.config.broker, this.config.options);
      
      // Eventos de conexión
      this.client.on('connect', this.handleConnect.bind(this));
      this.client.on('error', this.handleError.bind(this));
      this.client.on('close', this.handleClose.bind(this));
      this.client.on('reconnect', this.handleReconnect.bind(this));
      this.client.on('message', this.handleMessage.bind(this));
      this.client.on('offline', this.handleOffline.bind(this));
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout al conectar con MQTT broker'));
        }, 10000);
        
        this.client.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        this.client.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
    } catch (error) {
      console.error('❌ Error al conectar MQTT:', error);
      throw error;
    }
  }

  /**
   * Maneja la conexión exitosa
   */
  handleConnect() {
    console.log('✅ Conectado al broker MQTT');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Suscribirse a los topics
    this.subscribe();
    
    // Notificar estado de conexión
    this.emit('connection', { connected: true, error: null });
    
    // Publicar estado online del dashboard
    this.publish(this.config.topics.solarStatus, {
      client: 'dashboard',
      status: 'online',
      timestamp: Date.now()
    });
  }

  /**
   * Maneja errores de conexión
   */
  handleError(error) {
    console.error('❌ Error MQTT:', error);
    this.isConnected = false;
    this.emit('connection', { 
      connected: false, 
      error: `Error de conexión: ${error.message}` 
    });
  }

  /**
   * Maneja la desconexión
   */
  handleClose() {
    console.warn('⚠️ Conexión MQTT cerrada');
    this.isConnected = false;
    this.emit('connection', { 
      connected: false, 
      error: 'Conexión perdida con el broker MQTT' 
    });
  }

  /**
   * Maneja intentos de reconexión
   */
  handleReconnect() {
    this.reconnectAttempts++;
    console.log(`🔄 Reintentando conexión MQTT... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Máximo número de reconexiones alcanzado');
      this.disconnect();
      this.emit('connection', { 
        connected: false, 
        error: 'No se pudo reconectar al broker MQTT' 
      });
    }
  }

  /**
   * Maneja cuando el cliente está offline
   */
  handleOffline() {
    console.warn('📴 Cliente MQTT offline');
    this.isConnected = false;
  }

  /**
   * Maneja mensajes recibidos
   */
  handleMessage(topic, message) {
    try {
      const data = JSON.parse(message.toString());
      console.log('📩 Mensaje recibido:', { topic, data });
      
      switch (topic) {
        case this.config.topics.solarData:
          this.emit('solarData', data);
          break;
        case this.config.topics.solarStatus:
          this.emit('solarStatus', data);
          break;
        default:
          console.warn('Topic no reconocido:', topic);
      }
    } catch (error) {
      console.error('❌ Error al parsear mensaje MQTT:', error);
    }
  }

  /**
   * Se suscribe a los topics necesarios
   */
  subscribe() {
    const topics = Object.values(this.config.topics);
    
    topics.forEach(topic => {
      this.client.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          console.error(`❌ Error al suscribirse a ${topic}:`, error);
        } else {
          console.log(`✅ Suscrito a topic: ${topic}`);
        }
      });
    });
  }

  /**
   * Publica un mensaje en un topic
   */
  publish(topic, data, options = { qos: 1, retain: false }) {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ No conectado, no se puede publicar mensaje');
      return false;
    }

    try {
      const message = JSON.stringify(data);
      this.client.publish(topic, message, options, (error) => {
        if (error) {
          console.error('❌ Error al publicar mensaje:', error);
        } else {
          console.log(`📤 Mensaje publicado en ${topic}:`, data);
        }
      });
      return true;
    } catch (error) {
      console.error('❌ Error al preparar mensaje para publicación:', error);
      return false;
    }
  }

  /**
   * Añade un listener para eventos
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remueve un listener
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emite un evento a todos los listeners
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error en listener de ${event}:`, error);
        }
      });
    }
  }

  /**
   * Desconecta del broker MQTT
   */
  disconnect() {
    if (this.client) {
      console.log('🔌 Desconectando del broker MQTT...');
      
      // Publicar estado offline antes de desconectar
      this.publish(this.config.topics.solarStatus, {
        client: 'dashboard',
        status: 'offline',
        timestamp: Date.now()
      });
      
      this.client.end(false, () => {
        console.log('✅ Desconectado del broker MQTT');
      });
      
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Obtiene el estado actual de la conexión
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      clientId: this.config.options.clientId
    };
  }
}

// Singleton para usar en toda la aplicación
const mqttService = new MqttService();

export default mqttService;

// También exportamos la clase para casos especiales
export { MqttService };