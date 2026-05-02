import React from 'react';
import { NavLink } from 'react-router-dom';
import { SunMedium, BatteryCharging, Lightbulb } from 'lucide-react';

const navItems = [
  { to: '/', end: true, label: 'Panel Solar', icon: SunMedium },
  { to: '/bateria', label: 'Batería', icon: BatteryCharging },
  { to: '/iluminacion', label: 'Iluminación', icon: Lightbulb },
];

function SectionNavbar() {
  return (
    <nav className="section-navbar card" aria-label="Módulos principales">
      <div className="section-navbar__label">Módulos principales</div>
      <div className="section-navbar__links">
        {navItems.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `section-navbar__link${isActive ? ' section-navbar__link--active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default SectionNavbar;