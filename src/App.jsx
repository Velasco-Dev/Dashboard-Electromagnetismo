import React from 'react';
import { useSolarData } from './hooks/useSolarData';
import StatCard from './components/StatCard';
import ChartCard from './components/ChartCard';
import { Sun, Battery, BatteryCharging, Zap, Activity } from 'lucide-react';
import './index.css';

function App() {
  const { data, history, isConnected, error } = useSolarData();

  // Determinamos el estado de la batería
  const isCharging = data.current_panel > 0 && data.voltage_panel > data.voltage_battery;

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

  return (
    <div className="dashboard-container">
      <header className="header">
        <div>
          <h1>Dashboard Sistema Fotovoltaico IoT</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>Monitor en tiempo real ESP32 + INA219</p>
        </div>
        
        <div className={`status-badge ${isConnected ? 'online' : 'offline'}`}>
          <div className={`status-dot ${error ? 'animate-pulse' : ''}`}></div>
          {isConnected ? 'Sistema en Linea' : 'Conectando / Uso de Datos Simulados'}
        </div>
      </header>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Activity size={20} />
          {error}
        </div>
      )}

      {/* Sección 1: Generación Panel Solar */}
      <h2 className="section-title">Generación (Panel Solar)</h2>
      <div className="grid grid-cols-2">
        <StatCard 
          title="Voltaje Panel" 
          value={data.voltage_panel} 
          unit="V" 
          icon={Sun} 
          colorClass="warning" 
        />
        <StatCard 
          title="Corriente Panel" 
          value={data.current_panel} 
          unit="A" 
          icon={Activity} 
          colorClass="primary" 
        />
        <ChartCard 
          title="Histórico Voltaje Panel (Tiempo Real)" 
          data={history} 
          dataKey="voltage_panel" 
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
              value={data.voltage_battery} 
              unit="V" 
              icon={isCharging ? BatteryCharging : Battery} 
              colorClass={getBatteryColor(data.voltage_battery)} 
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
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Estado de Batería</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: isCharging ? 'var(--success)' : 'var(--warning)' }}>
                  {isCharging ? 'Cargando' : 'Descargando'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección 3 y 4: Consumo y Potencia */}
        <div>
          <h2 className="section-title" style={{ marginTop: 0 }}>Consumo y Potencia</h2>
          <div className="grid grid-cols-2">
            <StatCard 
              title="Corriente Carga (LEDs)" 
              value={data.current_load} 
              unit="A" 
              icon={Activity} 
              colorClass="primary" 
            />
            <StatCard 
              title="Potencia Total" 
              value={data.power} 
              unit="W" 
              icon={Zap} 
              colorClass={getPowerColor(data.power)} 
            />
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
