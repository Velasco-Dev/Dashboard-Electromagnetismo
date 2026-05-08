import React from 'react';
import { Sun, Activity, Zap } from 'lucide-react';
import StatCard from '../StatCard';
import ChartCard from '../ChartCard';

function PanelSection({ data, liveData, history, getPowerColor }) {
  const chartData = history.length > 0 ? history : liveData;

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
          title="Potencia Panel"
          value={data.panel_power ?? data.power}
          unit="W"
          icon={Zap}
          colorClass={getPowerColor(data.panel_power ?? data.power)}
        />
      </div>

      <div className="grid grid-cols-3 chart-grid">
        <ChartCard
          title="Voltaje Panel vs Tiempo (V)"
          data={chartData}
          dataKey="panel_voltage"
          colorHex="var(--chart-violet)"
          gradientId="panelVoltageGrad"
        />
        <ChartCard
          title="Corriente Panel vs Tiempo (A)"
          data={chartData}
          dataKey="panel_current"
          colorHex="var(--chart-cyan)"
          gradientId="panelCurrentGrad"
        />
        <ChartCard
          title="Potencia Panel vs Tiempo (W)"
          data={chartData}
          dataKey="panel_power"
          colorHex="var(--chart-pink)"
          gradientId="panelPowerGrad"
        />
      </div>
    </section>
  );
}

export default PanelSection;
