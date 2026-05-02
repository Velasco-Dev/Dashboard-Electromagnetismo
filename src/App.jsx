import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSolarData } from './hooks/useSolarData';
import SectionNavbar from './components/SectionNavbar';
import { Activity, WifiOff, Wifi, Cpu, Database, RefreshCw } from 'lucide-react';
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
      <div className="app-ambient" aria-hidden="true"></div>
      <header className="hero-panel">
        <div className="hero-copy">
          <div className="hero-kicker">Sistema fotovoltaico inteligente</div>
          <h1>Control solar con lectura en vivo e histórico persistido</h1>
          <p className="hero-subtitle">
            Supervisión de panel, batería y carga con ESP32, MQTT y MongoDB en una sola vista.
          </p>

          <div className="hero-meta">
            <div className={`status-badge ${statusInfo.className}`}>
              <div className={`status-dot ${error ? 'animate-pulse' : ''}`}></div>
              {statusInfo.icon}
              {statusInfo.text}
            </div>

            <div className="meta-pill">
              <Database size={16} />
              {dbStatus.connected ? `Mongo sincronizado · ${dbStatus.recordCount} registros` : 'Mongo no disponible'}
            </div>

            <div className="meta-pill">
              <RefreshCw size={16} />
              Próxima sync DB: {dbStatus.connected ? `${dbCountdown}s` : 'sin conexión'}
            </div>
          </div>
        </div>

        <div className="hero-spotlight card">
          <div className="hero-spotlight__top">
            <span className="eyebrow">Resumen operativo</span>
            <Cpu size={18} />
          </div>

          <div className="hero-spotlight__metric">
            <span className="hero-spotlight__label">Potencia instantánea</span>
            <strong>{Number(data.power).toFixed(2)} W</strong>
          </div>

          <div className="hero-spotlight__grid">
            <div>
              <span>Panel</span>
              <strong>{Number(data.panel_voltage).toFixed(2)} V</strong>
            </div>
            <div>
              <span>Batería</span>
              <strong>{Number(data.battery_voltage).toFixed(2)} V</strong>
            </div>
            <div>
              <span>MQTT</span>
              <strong>{isConnected ? 'Online' : 'Offline'}</strong>
            </div>
            <div>
              <span>Fuente</span>
              <strong>{dataSource === 'mqtt' ? 'Tiempo real' : 'Histórico / espera'}</strong>
            </div>
          </div>
        </div>
      </header>

      <div className="section-navbar-wrap">
        <SectionNavbar />
      </div>

      {error && (
        <div className="notice-banner notice-banner--danger">
          <Activity size={20} />
          {error}
        </div>
      )}

      {dataSource === 'disconnected' && !error && (
        <div className="notice-banner notice-banner--danger">
          <WifiOff size={20} />
          ESP32 desconectado. Esperando conexión del dispositivo...
        </div>
      )}

      {dataSource === 'mqtt_no_sensors' && (
        <div className="notice-banner notice-banner--warning">
          <Wifi size={20} />
          ESP32 conectado y enviando datos, pero los sensores INA219 no están conectados. Los valores son 0.
        </div>
      )}

      <div className="route-stage">
        <Outlet
          context={{
            data,
            history,
            liveData,
            isConnected,
            dataSource,
            dbStatus,
            isCharging,
            getBatteryColor,
            getPowerColor,
          }}
        />
      </div>
    </div>
  );
}

export default App;
