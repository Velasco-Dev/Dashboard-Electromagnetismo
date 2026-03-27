/**
 * Custom Hook para manejar datos del sistema fotovoltaico IoT
 * Conecta con MQTT en tiempo real - sin datos simulados
 * @author Sistema IoT Fotovoltaico
 */
import { useState, useEffect, useRef } from 'react';
import mqttService from '../services/mqttService.js';

export const useSolarData = () => {
  const [data, setData] = useState({
    panel_voltage: 0,
    panel_current: 0,
    battery_voltage: 0,
    battery_current: 0,
    load_current: 0,
    power: 0,
    sensors_status: {},
    measurement_id: 0,
    timestamp: Date.now()
  });

  const [history, setHistory] = useState([]); // Datos historicos de MongoDB
  const [liveData, setLiveData] = useState([]); // Datos en tiempo real de MQTT (últimos minutos)
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('disconnected'); // 'mqtt', 'mqtt_no_sensors', 'disconnected'
  const [dbStatus, setDbStatus] = useState({
    connected: false,
    lastSync: null,
    recordCount: 0,
    nextSync: null
  });
  const lastDataRef = useRef(Date.now());
  const DB_SYNC_INTERVAL = 30; // segundos entre recargas del historial

  const handleMqttData = (receivedData) => {
    // console.log('📊 Datos en tiempo real (MQTT):', receivedData);

    if (typeof receivedData !== 'object' || receivedData === null) return;

    lastDataRef.current = Date.now();
    setError(null);

    const tsRaw = receivedData.timestamp || 0;
    const timestamp = tsRaw < 1e12 ? tsRaw : tsRaw; // millis() de ESP32 es relativo, pero manejamos la lógica de tiempo

    const processedData = {
      // Mapeo dinámico: acepta camelCase (ESP32) o snake_case (Backend)
      panel_voltage: Number(receivedData.panel_voltage || receivedData.panelVoltage) || 0,
      panel_current: Number(receivedData.panel_current || receivedData.panelCurrent) || 0,
      battery_voltage: Number(receivedData.battery_voltage || receivedData.batteryVoltage) || 0,
      battery_current: Number(receivedData.battery_current || receivedData.batteryCurrent) || 0,
      load_current: Number(receivedData.load_current || receivedData.loadCurrent) || 0,
      power: Number(receivedData.power || receivedData.panelPower) || 0,
      sensors_status: receivedData.sensors_status || {},
      measurement_id: receivedData.timestamp || 0,
      timestamp: Date.now() // Forzamos timestamp actual en Live para fluidez
    };

    // Detectar si los sensores INA219 están conectados
    const sensores = receivedData.sensors_status || {};
    // Si el ESP32 envía datos de voltaje mayores a 0, asumimos que hay sensores activos aunque no envíe el diccionario de estado
    const hayLecturaPositiva = processedData.panel_voltage > 0 || processedData.battery_voltage > 0;
    const haySensorConectado = Object.values(sensores).some(s => s.connected === true) || hayLecturaPositiva;

    setDataSource(haySensorConectado ? 'mqtt' : 'mqtt_no_sensors');
    setData(processedData);

    // Actualizamos solo la lista de datos "Live"
    updateLiveHistory(processedData);
  };

  const handleConnectionChange = (connectionData) => {
    console.log('🔌 Estado conexión MQTT:', connectionData);
    setIsConnected(connectionData.connected);

    if (connectionData.error) {
      setError(connectionData.error);
      setDataSource('disconnected');
    } else if (connectionData.connected) {
      setError(null);
    } else {
      setDataSource('disconnected');
    }
  };

  const updateLiveHistory = (newData) => {
    setLiveData(prev => {
      const updated = [...prev, {
        time: new Date(newData.timestamp).toLocaleTimeString('es-ES', { hour12: false }),
        ...newData
      }];
      // Mantener solo los últimos 20 puntos para la vista "Live"
      return updated.length > 20 ? updated.slice(-20) : updated;
    });
  };

  // Cargar historial desde MongoDB al iniciar
  const loadHistoryFromDB = async () => {
    try {
      const API_URL = 'http://localhost:3001/api/measurements';
      const res = await fetch(`${API_URL}/recent?minutes=60`);
      if (!res.ok) throw new Error('Error al obtener historial');
      const json = await res.json();
      console.log(json);

      if (json.success && json.data) {
        const dbHistory = json.data
          .reverse() // Más antiguos primero
          .map(doc => {
            const ts = doc.marca_tiempo ? (doc.marca_tiempo < 1e12 ? doc.marca_tiempo * 1000 : doc.marca_tiempo) : new Date(doc.recibido_en).getTime();
            return {
              time: new Date(ts).toLocaleTimeString('es-ES', { hour12: false }),
              panel_voltage: doc.voltaje_panel || 0,
              panel_current: doc.corriente_panel || 0,
              battery_voltage: doc.voltaje_bateria || 0,
              battery_current: doc.corriente_bateria || 0,
              load_current: doc.corriente_carga || 0,
              power: doc.potencia || 0,
              timestamp: ts
            };
          })
          .slice(-100); // Últimos 100 puntos

        setHistory(dbHistory);
        setDbStatus({
          connected: true,
          lastSync: new Date(),
          recordCount: json.data.length,
          nextSync: new Date(Date.now() + DB_SYNC_INTERVAL * 1000)
        });
        // console.log(` Historial cargado de MongoDB: ${dbHistory.length} registros`);
      }
    } catch (err) {
      // console.warn('⚠️ No se pudo cargar historial de MongoDB:', err.message);
      setDbStatus(prev => ({ ...prev, connected: false }));
    }
  };

  useEffect(() => {
    // console.log('🚀 Inicializando hook useSolarData...');

    // Cargar historial de la DB primero
    loadHistoryFromDB();

    mqttService.on('solarData', handleMqttData);
    mqttService.on('connection', handleConnectionChange);

    const initMqtt = async () => {
      try {
        await mqttService.connect();
      } catch (err) {
        console.error('❌ Error al conectar MQTT:', err);
        setError('No se pudo conectar al broker MQTT');
        setDataSource('disconnected');
      }
    };

    initMqtt();

    // Recargar historial de la DB periódicamente
    const dbSyncInterval = setInterval(() => {
      loadHistoryFromDB();
    }, DB_SYNC_INTERVAL * 1000);

    // Si no llegan datos en 30s, marcar como desconectado
    const freshnessInterval = setInterval(() => {
      const timeSinceLastData = Date.now() - lastDataRef.current;
      if (timeSinceLastData > 30000 && dataSource === 'mqtt') {
        console.warn('⚠️ Sin datos recientes del ESP32');
        setDataSource('disconnected');
      }
    }, 15000);

    return () => {
      mqttService.off('solarData', handleMqttData);
      mqttService.off('connection', handleConnectionChange);
      clearInterval(freshnessInterval);
      clearInterval(dbSyncInterval);
    };
  }, []);

  return {
    data,
    history,      // Datos de MongoDB
    liveData,     // Datos de MQTT
    isConnected,
    error,
    dataSource,
    dbStatus,
    connectionStatus: mqttService.getConnectionStatus(),
    refreshHistory: loadHistoryFromDB
  };
};
