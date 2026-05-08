import React from 'react';
import { Lightbulb, Wifi, Database, Activity, Zap } from 'lucide-react';
import StatCard from '../StatCard';
import ChartCard from '../ChartCard';

function LightingSection({ data, history, liveData, isConnected, dataSource, dbStatus }) {
  const chartData = history.length > 0 ? history : liveData;

  return (
    <section id="iluminacion" className="dashboard-section dashboard-section--spaced dashboard-section--bottom dashboard-section--anchored">
      <div className="section-heading">
        <span className="eyebrow">Iluminación</span>
        <h2 className="section-title">Consumo de carga y estado del módulo</h2>
      </div>

      <div className="grid grid-cols-3 grid-cols-featured">
        <StatCard
          title="Voltaje Carga"
          value={data.load_voltage}
          unit="V"
          icon={Lightbulb}
          colorClass="warning"
        />
        <StatCard
          title="Corriente Carga"
          value={data.load_current}
          unit="A"
          icon={Activity}
          colorClass="primary"
        />
        <StatCard
          title="Potencia Carga"
          value={data.load_power}
          unit="W"
          icon={Zap}
          colorClass="danger"
        />
      </div>

      <div className="grid grid-cols-3 chart-grid">
        <ChartCard
          title="Voltaje Carga vs Tiempo (V)"
          data={chartData}
          dataKey="load_voltage"
          colorHex="var(--chart-violet)"
          gradientId="loadVoltageGrad"
        />
        <ChartCard
          title="Corriente Carga vs Tiempo (A)"
          data={chartData}
          dataKey="load_current"
          colorHex="var(--chart-cyan)"
          gradientId="loadCurrentGrad"
        />
        <ChartCard
          title="Potencia Carga vs Tiempo (W)"
          data={chartData}
          dataKey="load_power"
          colorHex="var(--chart-pink)"
          gradientId="loadPowerGrad"
        />
      </div>

      <div className="grid grid-cols-2 chart-grid">
        <div className="card connectivity-card">
          <div className="connectivity-card__label">Estado Conectividad</div>
          <div className="connectivity-card__status">
            <div className={`connectivity-card__led ${isConnected ? 'connectivity-card__led--online' : 'connectivity-card__led--offline'}`}></div>
            <span>{isConnected ? 'MQTT ONLINE' : 'OFFLINE'}</span>
          </div>
          <div className="connectivity-card__hint">
            ESP32: {dataSource === 'mqtt' ? 'Activo' : 'Buscando...'}
          </div>
          <div className="lighting-card__footer">
            <Wifi size={14} />
            Enlace de telemetría en tiempo real
          </div>
        </div>
        <div className="card database-card">
          <Database size={24} color={dbStatus.connected ? 'var(--primary)' : 'var(--danger)'} />
          <div>
            <div className="database-card__title">Carga Histórica</div>
            <div className="database-card__caption">
              {dbStatus.connected ? `Sincronizado (${dbStatus.recordCount})` : 'Sin DB'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LightingSection;
