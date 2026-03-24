import React from 'react';
import { useSolarData } from './hooks/useSolarData';
import StatCard from './components/StatCard';
import ChartCard from './components/ChartCard';
import { Sun, Battery, BatteryCharging, Zap, Activity, WifiOff, Wifi, Cpu, Database, RefreshCw } from 'lucide-react';
import './index.css';

function App() {
  const { data, history, isConnected, error, dataSource, dbStatus } = useSolarData();

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

            <StatCard 
              title="Corriente Carga" 
              value={data.load_current} 
              unit="A" 
              icon={Activity} 
              colorClass="primary" 
            />
            
            {/* Información de conexión MQTT y sensores */}
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
                Datos: {dataSource === 'mqtt' ? 'ESP32 - Sensores Activos' : dataSource === 'mqtt_no_sensors' ? 'ESP32 - Sin Sensores' : 'Sin datos - Desconectado'}
              </div>
              {dataSource === 'mqtt' && data.measurement_id > 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Medición #{data.measurement_id}
                </div>
              )}
              {data.timestamp && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Última actualización: {new Date(data.timestamp).toLocaleTimeString()}
                </div>
              )}

              {/* Estado de sensores del ESP32 */}
              {data.sensors_status && Object.keys(data.sensors_status).length > 0 && (
                <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                    <Cpu size={14} /> Sensores INA219
                  </div>
                  {Object.entries(data.sensors_status).map(([name, status]) => (
                    <div key={name} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: status.connected ? 'var(--success)' : 'var(--danger)', display: 'inline-block' }}></span>
                      {name}: {status.connected ? 'Conectado' : 'No conectado'}
                    </div>
                  ))}
                </div>
              )}

              {/* Estado de conexión a MongoDB */}
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                  <Database size={14} /> Base de Datos (MongoDB)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: dbStatus.connected ? 'var(--success)' : 'var(--danger)', display: 'inline-block' }}></span>
                  {dbStatus.connected ? 'Conectada' : 'Sin conexión'}
                </div>
                {dbStatus.connected && (
                  <>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Registros históricos: {dbStatus.recordCount}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Última sync: {dbStatus.lastSync ? new Date(dbStatus.lastSync).toLocaleTimeString('es-ES', { hour12: false }) : '—'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <RefreshCw size={12} style={dbCountdown <= 3 ? { animation: 'spin 1s linear infinite' } : {}} />
                      Próxima recarga: {dbCountdown}s
                    </div>
                  </>
                )}
              </div>
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
