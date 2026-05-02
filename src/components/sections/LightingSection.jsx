import React from 'react';
import { Lightbulb, Wifi, Database } from 'lucide-react';
import StatCard from '../StatCard';

function LightingSection({ data, isConnected, dataSource, dbStatus }) {
  return (
    <section id="iluminacion" className="dashboard-section dashboard-section--spaced dashboard-section--bottom dashboard-section--anchored">
      <div className="section-heading">
        <span className="eyebrow">Iluminación</span>
        <h2 className="section-title">Consumo de carga y estado del módulo</h2>
      </div>

      <div className="grid grid-cols-3 grid-cols-featured">
        <StatCard
          title="Corriente Iluminación"
          value={data.load_current}
          unit="A"
          icon={Lightbulb}
          colorClass="primary"
        />
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