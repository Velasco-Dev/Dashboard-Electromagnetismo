import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ChartCard = ({ title, data, dataKey, colorHex, gradientId }) => {
  return (
    <div className="card chart-card" style={{ gridColumn: '1 / -1' }}>
      <div className="card-header chart-card__header">{title}</div>
      <div className="chart-container">
        {data.length === 0 && (
          <div className="chart-card__empty">Sin datos para graficar todavía.</div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colorHex} stopOpacity={0.65}/>
                <stop offset="95%" stopColor={colorHex} stopOpacity={0.02}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="time" stroke="var(--chart-axis)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--chart-axis)" fontSize={12} tickLine={false} axisLine={false} />
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '1rem', color: 'var(--text-main)', boxShadow: '0 18px 40px rgba(0, 0, 0, 0.24)', backdropFilter: 'blur(18px)' }} 
              itemStyle={{ color: colorHex }}
              labelStyle={{ color: 'var(--text-soft)' }}
            />
            <Area type="monotone" dataKey={dataKey} stroke={colorHex} strokeWidth={2.5} fillOpacity={1} fill={`url(#${gradientId})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartCard;
