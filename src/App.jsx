import React from 'react';
import { useSolarData } from './hooks/useSolarData';
import StatCard from './components/StatCard';
import ChartCard from './components/ChartCard';
import { Sun, Battery, BatteryCharging, Zap, Activity, WifiOff, Wifi, Cpu, Database, RefreshCw } from 'lucide-react';
import './index.css';

function App() {
  const { data, history, liveData, isConnected, error, dataSource, dbStatus } = useSolarData();

  // Countdown para próxima sincronización DB
  const [dbCountdown, setDbCountdown] = React.useState(30);
  React.useEffect(() => {
    const timer = setInterval(() => {
      if (dbStatus.nextSync) {
        const remaining = Math.max(0, Math.round((new Date(dbStatus.nextSync).getTime() - Date.now()) / 1000));
        setDbCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [dbStatus.nextSync]);

  // Determinamos el estado de la batería
  const isCharging = data.panel_current > 0 && data.panel_voltage > data.battery_voltage;

  // Helper para determinar colores basados en umbrales (Verde, Amarillo, Rojo)
  const getBatteryColor = (voltage) => {
    if (voltage < 10.5) return 'danger'; // Critico
    if (voltage < 11.5) return 'warning'; // Medio
    return 'success'; // Normal
  };

  const getPowerColor = (power) => {
    if (power > 50) return 'danger';
    if (power > 30) return 'warning';
    return 'success';
  };

  // Determinar icono y texto de estado según la fuente de datos
  const getStatusInfo = () => {
    if (dataSource === 'mqtt') {
      return {
        icon: <Wifi size={16} />,
        text: 'ESP32 Conectado - Sensores Activos',
        className: 'online'
      };
    } else if (dataSource === 'mqtt_no_sensors') {
      return {
        icon: <Wifi size={16} />,
        text: 'ESP32 Conectado - Sin Sensores INA219',
        className: 'warning'
      };
    } else {
      return {
        icon: <WifiOff size={16} />,
        text: 'ESP32 Desconectado',
        className: 'offline'
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="dashboard-container">
      <header className="header">
        <div>
          <h1>Dashboard Sistema Fotovoltaico IoT</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>
            Monitor en tiempo real ESP32 + INA219 via MQTT
          </p>
        </div>
        
        <div className={`status-badge ${statusInfo.className}`}>
          <div className={`status-dot ${error ? 'animate-pulse' : ''}`}></div>
          {statusInfo.icon}
          {statusInfo.text}
        </div>
      </header>

      {error && (
        <div style={{ 
          backgroundColor: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid var(--danger)', 
          color: 'var(--danger)', 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          marginBottom: '1.5rem', 
          display: 'flex', 
          gap: '0.5rem', 
          alignItems: 'center' 
        }}>
          <Activity size={20} />
          {error}
        </div>
      )}

      {dataSource === 'disconnected' && !error && (
        <div style={{ 
          backgroundColor: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid var(--danger)', 
          color: 'var(--danger)', 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          marginBottom: '1.5rem', 
          display: 'flex', 
          gap: '0.5rem', 
          alignItems: 'center' 
        }}>
          <WifiOff size={20} />
          ESP32 desconectado. Esperando conexión del dispositivo...
        </div>
      )}

      {dataSource === 'mqtt_no_sensors' && (
        <div style={{ 
          backgroundColor: 'rgba(245, 158, 11, 0.1)', 
          border: '1px solid var(--warning)', 
          color: 'var(--warning)', 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          marginBottom: '1.5rem', 
          display: 'flex', 
          gap: '0.5rem', 
          alignItems: 'center' 
        }}>
          <Wifi size={20} />
          ESP32 conectado y enviando datos, pero los sensores INA219 no están conectados. Los valores son 0.
        </div>
      )}

      {/* 🚀 SECCIÓN 1: GENERACIÓN (PANEL SOLAR) */}
      <div className="dashboard-section">
        <h2 className="section-title">☀️ Generación (Panel Solar)</h2>
        <div className="grid grid-cols-2">
          <StatCard 
            title="Voltaje Panel" 
            value={data.panel_voltage} 
            unit="V" 
            icon={Sun} 
            colorClass="warning" 
          />
          <StatCard 
            title="Corriente Panel" 
            value={data.panel_current} 
            unit="A" 
            icon={Activity} 
            colorClass="primary" 
          />
        </div>
        <div className="grid grid-cols-2 mobile-stack" style={{ marginTop: '1rem', gap: '1.5rem' }}>
          <ChartCard 
            title="Voltaje en Tiempo Real (MQTT)" 
            data={liveData} 
            dataKey="panel_voltage" 
            colorHex="#f59e0b" 
            gradientId="colorVoltageLive" 
          />
          <ChartCard 
            title="Corriente en Tiempo Real (MQTT) [Amperios]" 
            data={liveData} 
            dataKey="panel_current" 
            colorHex="#3b82f6" 
            gradientId="colorCurrentLive" 
          />
        </div>
      </div>

      {/* 🔋 SECCIÓN 2: ALMACENAMIENTO (BATERÍA) */}
      <div className="dashboard-section" style={{ marginTop: '2rem' }}>
        <h2 className="section-title">🔋 Almacenamiento (Batería)</h2>
        <div className="grid grid-cols-2 mobile-stack">
          <StatCard 
            title="Voltaje Batería" 
            value={data.battery_voltage} 
            unit="V" 
            icon={isCharging ? BatteryCharging : Battery} 
            colorClass={getBatteryColor(data.battery_voltage)} 
          />
          <div className="card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
            <div 
              className="status-icon-container"
              style={{ 
                backgroundColor: isCharging ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                padding: '1rem', 
                borderRadius: '50%'
              }}
            >
              {isCharging ? 
                <BatteryCharging size={24} color="var(--success)" /> : 
                <Battery size={24} color="var(--warning)" />
              }
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Estado de Carga</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: isCharging ? 'var(--success)' : 'var(--warning)' }}>
                {isCharging ? 'Cargando' : 'Descargando'}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {Math.abs(data.battery_current).toFixed(3)} mA
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 💡 SECCIÓN 3: CONTROL Y SISTEMA (LEDS / MQTT) */}
      <div className="dashboard-section" style={{ marginTop: '2rem' }}>
        <h2 className="section-title">⚙️ Control y Sistema</h2>
        <div className="grid grid-cols-3">
          {/* Potencia */}
          <StatCard 
            title="Potencia Total" 
            value={data.power} 
            unit="mW" 
            icon={Zap} 
            colorClass={getPowerColor(data.power)} 
          />

          {/* Estado de Conexión (LED Visual) */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Estado Conectividad</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%', 
                backgroundColor: isConnected ? 'var(--success)' : 'var(--danger)',
                boxShadow: isConnected ? '0 0 10px var(--success)' : 'none'
              }}></div>
              <span style={{ fontWeight: 600 }}>{isConnected ? 'MQTT ONLINE' : 'OFFLINE'}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              ESP32: {dataSource === 'mqtt' ? 'Activo' : 'Buscando...'}
            </div>
          </div>

          {/* Base de Datos */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Database size={24} color={dbStatus.connected ? 'var(--primary)' : 'var(--danger)'} />
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Carga Histórica</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {dbStatus.connected ? `Sincronizado (${dbStatus.recordCount})` : 'Sin DB'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📜 SECCIÓN 4: HISTORIAL (BASE DE DATOS MONGO) */}
      <div className="dashboard-section" style={{ marginTop: '2rem', marginBottom: '3rem' }}>
        <h2 className="section-title">📜 Historial Consumido (MongoDB)</h2>
        <div className="grid grid-cols-1">
          <ChartCard 
            title="Historial de Voltaje de Panel (Datos de Base de Datos)" 
            data={history} 
            dataKey="panel_voltage" 
            colorHex="#3b82f6" 
            gradientId="colorVoltageDB" 
          />
        </div>
      </div>
    </div>
  );
}

export default App;
