import React from 'react';
import '../styles/dashboard.css';

const StatsCard = ({ title, value, icon: Icon, theme = 'blue', subtitle, onClick }) => {
  return (
    <div className="stat-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className={`stat-icon-wrapper stat-icon-${theme}`}>
        {Icon && <Icon size={26} />}
      </div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{title}</div>
        {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>{subtitle}</div>}
      </div>
    </div>
  );
};

export default StatsCard;

