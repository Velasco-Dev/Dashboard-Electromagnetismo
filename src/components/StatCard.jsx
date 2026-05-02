import React from 'react';

const StatCard = ({ title, value, unit, icon: Icon, colorClass, highlight }) => {
  return (
    <div className={`card stat-card ${highlight ? `border-${colorClass}` : ''}`}>
      <div className="card-header stat-card__header">
        <span>{title}</span>
        {Icon && (
          <span className="stat-card__icon" style={{ color: `var(--${colorClass})` }}>
            <Icon size={20} className={`text-${colorClass}`} />
          </span>
        )}
      </div>
      <div className="stat-card__body">
        <span className="card-value">{value}</span>
        <span className="card-unit">{unit}</span>
      </div>
    </div>
  );
};

export default StatCard;
