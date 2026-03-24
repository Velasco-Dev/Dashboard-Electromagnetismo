import React from 'react';
import { useSolarData } from './hooks/useSolarData';
import StatCard from './components/StatCard';
import ChartCard from './components/ChartCard';
import { Sun, Battery, BatteryCharging, Zap, Activity, WifiOff, Wifi, Database } from 'lucide-react';
import './index.css';

function App() {
  const { data, history, isConnected, error, dataSource } = useSolarData();

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
    if (isConnected && dataSource === 'mqtt') {
      return {
        icon: <Wifi size={16} />,
        text: 'ESP32 Conectado - Datos en Tiempo Real',
        className: 'online'
      };
    } else if (dataSource === 'simulated') {
      return {
        icon: <Database size={16} />,
        text: 'Modo Simulación - Datos de Prueba',
        className: 'offline'
      };
    } else {
      return {
        icon: <WifiOff size={16} />,
        text: 'Conectando al Sistema...',
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

      {/* Información de modo de datos */}
      {dataSource === 'simulated' && (
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
          <Database size={20} />
          Usando datos simulados. Para conectar el ESP32, configure las credenciales WiFi y MQTT.
        </div>
      )}

      {/* Sección 1: Generación Panel Solar */}
      <h2 className="section-title">Generación (Panel Solar)</h2>
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
        <ChartCard 
          title="Histórico Voltaje Panel (Tiempo Real)" 
          data={history} 
          dataKey="panel_voltage" 
          colorHex="#f59e0b" 
          gradientId="colorVoltage" 
        />
      </div>

      <div className="grid grid-cols-2" style={{ marginTop: '1.5rem', gap: '1.5rem' }}>
        {/* Sección 2: Batería */}
        <div>
          <h2 className="section-title" style={{ marginTop: 0 }}>Almacenamiento (Batería)</h2>
          <div className="grid grid-cols-1">
            <StatCard 
              title="Voltaje Batería" 
              value={data.battery_voltage} 
              unit="V" 
              icon={isCharging ? BatteryCharging : Battery} 
              colorClass={getBatteryColor(data.battery_voltage)} 
            />
            <div className="card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
              <div 
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
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Estado de Batería
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: isCharging ? 'var(--success)' : 'var(--warning)' }}>
                  {isCharging ? 'Cargando' : 'Descargando'}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {Math.abs(data.battery_current).toFixed(3)} A
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección 3: Potencia y Información del Sistema */}
        <div>
          <h2 className="section-title" style={{ marginTop: 0 }}>Potencia y Sistema</h2>
          <div className="grid grid-cols-1">
            <StatCard 
              title="Potencia Total" 
              value={data.power} 
              unit="W" 
              icon={Zap} 
              colorClass={getPowerColor(data.power)} 
            />
            
            {/* Información de conexión MQTT */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.5rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>
                Estado de Conexión
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isConnected ? 
                  <Wifi size={20} color="var(--success)" /> : 
                  <WifiOff size={20} color="var(--danger)" />
                }
                <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                  MQTT: {isConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Datos: {dataSource === 'mqtt' ? 'ESP32 Real' : dataSource === 'simulated' ? 'Simulados' : 'Conectando...'}
              </div>
              {data.timestamp && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Última actualización: {new Date(data.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1" style={{ marginTop: '1.5rem' }}>
        <ChartCard 
          title="Potencia Generada (Tiempo Real)" 
          data={history} 
          dataKey="power" 
          colorHex="#10b981" 
          gradientId="colorPower" 
        />
      </div>

    </div>
  );
}

export default App;
