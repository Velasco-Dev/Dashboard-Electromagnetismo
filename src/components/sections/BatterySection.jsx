import React from 'react';
import { Battery, BatteryCharging, Activity } from 'lucide-react';
import StatCard from '../StatCard';

function BatterySection({ data, isCharging, getBatteryColor }) {
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
    </section>
  );
}

export default BatterySection;