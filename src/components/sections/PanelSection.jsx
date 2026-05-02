import React from 'react';
import { Sun, Activity, Zap } from 'lucide-react';
import StatCard from '../StatCard';
import ChartCard from '../ChartCard';

function PanelSection({ data, liveData, history, getPowerColor }) {
  return (
    <section id="panel" className="dashboard-section dashboard-section--anchored">
      <div className="section-heading">
        <span className="eyebrow">Panel solar</span>
        <h2 className="section-title">Generación y evolución energética</h2>
      </div>

      <div className="grid grid-cols-3 grid-cols-featured">
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
        <StatCard
          title="Potencia Total"
          value={data.power}
          unit="W"
          icon={Zap}
          colorClass={getPowerColor(data.power)}
        />
      </div>

      <div className="grid grid-cols-2 chart-grid">
        <ChartCard
          title="Voltaje en Tiempo Real (MQTT)"
          data={liveData}
          dataKey="panel_voltage"
          colorHex="var(--chart-violet)"
          gradientId="colorVoltageLive"
        />
        <ChartCard
          title="Corriente en Tiempo Real (MQTT) [Amperios]"
          data={liveData}
          dataKey="panel_current"
          colorHex="var(--chart-cyan)"
          gradientId="colorCurrentLive"
        />
      </div>

      <div className="grid grid-cols-1 chart-grid">
        <ChartCard
          title="Historial de Voltaje de Panel (Datos de Base de Datos)"
          data={history}
          dataKey="panel_voltage"
          colorHex="var(--chart-pink)"
          gradientId="colorVoltageDB"
        />
      </div>
    </section>
  );
}

export default PanelSection;