import React from 'react';
import './Badge.css';

const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'badge-default',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    info: 'badge-info',
    pending: 'badge-pending',
    confirmed: 'badge-confirmed',
    completed: 'badge-completed',
    cancelled: 'badge-cancelled',
  };

  return <span className={`badge ${variants[variant] || variants.default} ${className}`}>{children}</span>;
};

export default Badge;