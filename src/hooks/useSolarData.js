import { useState, useEffect, useRef } from 'react';
import { getSolarData } from '../api/axios';

const MAX_HISTORY = 30; // 30 seconds of history

export const useSolarData = () => {
  const [data, setData] = useState({
    voltage_panel: 0,
    current_panel: 0,
    voltage_battery: 0,
    current_load: 0,
    power: 0
  });
  
  const [history, setHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  // Use a ref to always have access to the latest history in the interval
  // without re-triggering the useEffect closure
  const historyRef = useRef([]);

  useEffect(() => {
    // Definimos la función de polling
    const fetchData = async () => {
      try {
        // Ahora llamamos a nuestra API separada en api/axios.js
        const newData = await getSolarData();
        
        setData(newData);
        setIsConnected(true);
        setError(null);
        
        // Agregar timestamp y actualizar historial
        const point = {
          time: new Date().toLocaleTimeString('es-ES', { hour12: false }),
          ...newData
        };
        
        historyRef.current = [...historyRef.current, point].slice(-MAX_HISTORY);
        setHistory(historyRef.current);
        
      } catch (err) {
        setIsConnected(false);
        setError('Error de conexión o ESP32 offline');
        
        // Simulación de datos PARA DEMO si no hay hardware conectado
        // Esto permite ver el dashboard funcional aunque no haya ESP32
        const simData = {
          voltage_panel: (12 + Math.random() * 2).toFixed(1),
          current_panel: (2 + Math.random() * 0.5).toFixed(2),
          voltage_battery: (11.5 + Math.random() * 1).toFixed(1),
          current_load: (1 + Math.random() * 0.3).toFixed(2),
          power: (24 + Math.random() * 5).toFixed(1)
        };
        
        setData(simData);
        const point = {
          time: new Date().toLocaleTimeString('es-ES', { hour12: false }),
          ...simData
        };
        historyRef.current = [...historyRef.current, point].slice(-MAX_HISTORY);
        setHistory(historyRef.current);
      }
    };

    // Llamada inicial
    fetchData();

    // Iniciar polling
    const interval = setInterval(fetchData, 1000);

    // Cleanup: limpiar intervalo cuando se desmonta
    return () => clearInterval(interval);
  }, []);

  return { data, history, isConnected, error };
};
