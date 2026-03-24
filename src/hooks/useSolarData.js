/**
 * Custom Hook para manejar datos del sistema fotovoltaico IoT
 * Conecta con MQTT en tiempo real y maneja fallback a datos simulados
 * @author Sistema IoT Fotovoltaico
 */
import { useState, useEffect, useRef } from 'react';
import mqttService from '../services/mqttService.js';

export const useSolarData = () => {
  // Estado principal de los datos
  const [data, setData] = useState({
    panel_voltage: 0,
    panel_current: 0,
    battery_voltage: 0,
    battery_current: 0,
    power: 0,
    timestamp: Date.now()
  });

  // Historial de datos (últimos 50 puntos para gráficos)
  const [history, setHistory] = useState([]);
  
  // Estado de conexión MQTT
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('connecting'); // 'mqtt', 'simulated', 'connecting'
  
  // Referencias para intervalos
  const simulationRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const lastDataRef = useRef(Date.now());

  /**
   * Función para generar datos simulados realistas
   * Se usa como fallback cuando no hay conexión MQTT
   */
  const generateRealisticData = () => {
    const now = Date.now();
    const hour = new Date(now).getHours();
    
    // Simular variación solar según hora del día (6 AM - 6 PM)
    let solarFactor = 0;
    if (hour >= 6 && hour <= 18) {
      const solarHour = hour - 6;
      solarFactor = Math.sin((solarHour / 12) * Math.PI) * 0.8 + 0.2;
    }
    
    // Añadir ruido realista
    const noise = () => (Math.random() - 0.5) * 0.1;
    
    const panel_voltage = solarFactor > 0.1 ? (18.5 + solarFactor * 3.5 + noise()) : 0;
    const panel_current = solarFactor > 0.1 ? (solarFactor * 2.8 + noise()) : 0;
    
    const battery_voltage = 12.1 + Math.sin(now / 60000) * 0.3 + noise();
    const battery_current = panel_voltage > battery_voltage ? 
      -(panel_current * 0.85 + noise()) : // Cargando (negativo)
      Math.abs(1.8 + noise()); // Descargando (positivo)
    
    const power = Math.abs(panel_voltage * panel_current);
    
    return {
      panel_voltage: Math.max(0, parseFloat(panel_voltage.toFixed(2))),
      panel_current: Math.max(0, parseFloat(panel_current.toFixed(3))),
      battery_voltage: parseFloat(battery_voltage.toFixed(2)),
      battery_current: parseFloat(battery_current.toFixed(3)),
      power: parseFloat(power.toFixed(2)),
      timestamp: now
    };
  };

  /**
   * Maneja datos recibidos del ESP32 vía MQTT
   */
  const handleMqttData = (receivedData) => {
    console.log('📊 Datos recibidos del ESP32:', receivedData);
    
    // Validar estructura de datos
    if (!receivedData.timestamp || 
        typeof receivedData.panel_voltage !== 'number' || 
        typeof receivedData.panel_current !== 'number') {
      console.warn('⚠️ Datos MQTT inválidos:', receivedData);
      return;
    }

    // Actualizar timestamp de último dato recibido
    lastDataRef.current = Date.now();
    setDataSource('mqtt');
    
    // Procesar y limpiar datos
    const processedData = {
      panel_voltage: parseFloat(receivedData.panel_voltage.toFixed(2)),
      panel_current: parseFloat(receivedData.panel_current.toFixed(3)),
      battery_voltage: parseFloat(receivedData.battery_voltage.toFixed(2)),
      battery_current: parseFloat(receivedData.battery_current.toFixed(3)),
      power: parseFloat(receivedData.power.toFixed(2)),
      timestamp: receivedData.timestamp
    };
    
    setData(processedData);
    setError(null);
    
    // Actualizar historial
    updateHistory(processedData);
  };

  /**
   * Maneja cambios en el estado de conexión MQTT
   */
  const handleConnectionChange = (connectionData) => {
    console.log('🔌 Estado conexión MQTT:', connectionData);
    
    setIsConnected(connectionData.connected);
    
    if (connectionData.error) {
      setError(connectionData.error);
      
      // Si hay error, activar simulación como fallback
      if (!simulationRef.current) {
        startSimulation();
      }
    } else if (connectionData.connected) {
      setError(null);
      // Si se conecta exitosamente, detener simulación
      stopSimulation();
    }
  };

  /**
   * Actualiza el historial de datos
   */
  const updateHistory = (newData) => {
    setHistory(prev => {
      const updated = [...prev, {
        time: new Date(newData.timestamp).toLocaleTimeString('es-ES', { hour12: false }),
        ...newData
      }];
      // Mantener solo los últimos 50 puntos
      return updated.length > 50 ? updated.slice(-50) : updated;
    });
  };

  /**
   * Inicia la simulación de datos como fallback
   */
  const startSimulation = () => {
    console.log('🔄 Iniciando simulación de datos...');
    setDataSource('simulated');
    
    simulationRef.current = setInterval(() => {
      const simulatedData = generateRealisticData();
      setData(simulatedData);
      updateHistory(simulatedData);
    }, 5000); // Cada 5 segundos para simular el ESP32
  };

  /**
   * Detiene la simulación de datos
   */
  const stopSimulation = () => {
    if (simulationRef.current) {
      console.log('⏹️ Deteniendo simulación de datos');
      clearInterval(simulationRef.current);
      simulationRef.current = null;
    }
  };

  /**
   * Verifica si los datos MQTT están llegando
   */
  const checkDataFreshness = () => {
    const now = Date.now();
    const timeSinceLastData = now - lastDataRef.current;
    
    // Si no recibimos datos en más de 30 segundos, activar simulación
    if (timeSinceLastData > 30000 && isConnected) {
      console.warn('⚠️ No se han recibido datos recientes, activando simulación');
      setDataSource('simulated');
      if (!simulationRef.current) {
        startSimulation();
      }
    }
  };

  /**
   * Efecto principal para inicializar conexión MQTT
   */
  useEffect(() => {
    console.log('🚀 Inicializando hook useSolarData...');
    
    // Configurar listeners MQTT
    mqttService.on('solarData', handleMqttData);
    mqttService.on('connection', handleConnectionChange);
    
    // Intentar conectar al broker MQTT
    const initMqtt = async () => {
      try {
        await mqttService.connect();
      } catch (error) {
        console.error('❌ Error al conectar MQTT, usando simulación:', error);
        setError(`Error MQTT: ${error.message}`);
        startSimulation();
      }
    };

    // Timeout para activar simulación si no hay conexión en 10 segundos
    connectionTimeoutRef.current = setTimeout(() => {
      if (!isConnected) {
        console.warn('⏰ Timeout de conexión, activando simulación');
        startSimulation();
      }
    }, 10000);

    initMqtt();

    // Verificar frescura de datos cada 15 segundos
    const freshnessInterval = setInterval(checkDataFreshness, 15000);

    // Cleanup al desmontar
    return () => {
      mqttService.off('solarData', handleMqttData);
      mqttService.off('connection', handleConnectionChange);
      stopSimulation();
      
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      
      clearInterval(freshnessInterval);
    };
  }, []);

  /**
   * Efecto para limpiar error después de un tiempo
   */
  useEffect(() => {
    if (error) {
      const clearErrorTimeout = setTimeout(() => {
        setError(null);
      }, 10000); // Limpiar error después de 10 segundos
      
      return () => clearTimeout(clearErrorTimeout);
    }
  }, [error]);

  return {
    data,
    history,
    isConnected,
    error,
    dataSource, // Información adicional sobre la fuente de datos
    connectionStatus: mqttService.getConnectionStatus()
  };
};
