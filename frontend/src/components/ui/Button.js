import React from 'react';
import './Button.css';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  loading = false,
  disabled = false,
  ...props 
}) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    danger: 'btn-danger',
    warning: 'btn-warning',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
  };

  const sizes = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
  };

  return (
    <button
      className={`btn ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="btn-spinner" />}
      {children}
    </button>
  );
};

export default Button;