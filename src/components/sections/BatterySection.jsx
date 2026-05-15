import React, { useState } from 'react';
import { Battery, BatteryCharging, Activity, Zap } from 'lucide-react';
import StatCard from '../StatCard';
import ChartCard from '../ChartCard';
import HistoricalChartModal from '../HistoricalChartModal';

function BatterySection({ data, history, liveData, isCharging, getBatteryColor }) {
  const chartData = history.length > 0 ? history : liveData;
  const [selectedHistoricalChart, setSelectedHistoricalChart] = useState(null);

  return (
    <section id="bateria" className="dashboard-section dashboard-section--spaced dashboard-section--anchored">
      <div className="section-heading">
        <span className="eyebrow">Batería</span>
        <h2 className="section-title">Almacenamiento y estado de carga</h2>
      </div>

      <div className="grid grid-cols-3 grid-cols-featured">
        <StatCard
          title="Voltaje Batería"
          value={data.battery_voltage}
          unit="V"
          icon={isCharging ? BatteryCharging : Battery}
          colorClass={getBatteryColor(data.battery_voltage)}
        />
        <StatCard
          title="Corriente Batería"
          value={Math.abs(data.battery_current).toFixed(3)}
          unit="mA"
          icon={Activity}
          colorClass={isCharging ? 'success' : 'warning'}
        />
        <div className="card battery-status-card battery-status-card--featured">
          <div className={`status-icon-container ${isCharging ? 'status-icon-container--success' : 'status-icon-container--warning'}`}>
            {isCharging ? (
              <BatteryCharging size={24} color="var(--success)" />
            ) : (
              <Battery size={24} color="var(--warning)" />
            )}
          </div>
          <div>
            <div className="battery-status-card__label">Estado de Carga</div>
            <div className={`battery-status-card__state ${isCharging ? 'battery-status-card__state--success' : 'battery-status-card__state--warning'}`}>
              {isCharging ? 'Cargando' : 'Descargando'}
            </div>
            <div className="battery-status-card__value">
              Flujo actual: {Math.abs(data.battery_current).toFixed(3)} mA
            </div>
          </div>
        </div>
      </div>

      <div className="grid chart-grid chart-grid--stacked">
        <ChartCard
          title="Voltaje Batería vs Tiempo (V)"
          data={chartData}
          dataKey="battery_voltage"
          colorHex="var(--chart-violet)"
          gradientId="batteryVoltageGrad"
          actionLabel="Ver datos históricos"
          onActionClick={() => setSelectedHistoricalChart({
            title: 'Voltaje Batería vs Tiempo (V)',
            dataKey: 'battery_voltage',
            colorHex: 'var(--chart-violet)',
            gradientId: 'batteryVoltageGradDetail'
          })}
        />
        <ChartCard
          title="Corriente Batería vs Tiempo (mA)"
          data={chartData}
          dataKey="battery_current"
          colorHex="var(--chart-cyan)"
          gradientId="batteryCurrentGrad"
        />
        <ChartCard
          title="Potencia Batería vs Tiempo (W)"
          data={chartData}
          dataKey="battery_power"
          colorHex="var(--chart-pink)"
          gradientId="batteryPowerGrad"
        />
      </div>

      <HistoricalChartModal
        isOpen={Boolean(selectedHistoricalChart)}
        onClose={() => setSelectedHistoricalChart(null)}
        title={selectedHistoricalChart?.title || ''}
        dataKey={selectedHistoricalChart?.dataKey || 'battery_voltage'}
        colorHex={selectedHistoricalChart?.colorHex || 'var(--chart-violet)'}
        gradientId={selectedHistoricalChart?.gradientId || 'batteryHistoricalDetailGrad'}
        realtimeData={chartData}
      />
    </section>
  );
}

export default BatterySection;
