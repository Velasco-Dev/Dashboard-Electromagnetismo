import React from 'react';

const StatCard = ({ title, value, unit, icon: Icon, colorClass, highlight }) => {
  return (
    <div className={`card ${highlight ? `border-${colorClass}` : ''}`}>
      <div className="card-header">
        {title}
        {Icon && <Icon size={20} className={`text-${colorClass}`} style={{ color: `var(--${colorClass})` }} />}
      </div>
      <div>
        <span className="card-value">{value}</span>
        <span className="card-unit">{unit}</span>
      </div>
    </div>
  );
};

export default StatCard;
