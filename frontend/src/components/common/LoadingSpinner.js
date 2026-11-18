import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ 
  message = 'Loading...', 
  size = 'md', 
  fullscreen = true,
  inline = false 
}) => {
  const sizes = {
    sm: { width: '30px', height: '30px', fontSize: '14px', borderWidth: '3px' },
    md: { width: '50px', height: '50px', fontSize: '16px', borderWidth: '4px' },
    lg: { width: '70px', height: '70px', fontSize: '20px', borderWidth: '5px' }
  };

  const sizeStyle = sizes[size] || sizes.md;

  const containerClass = `spinner-container ${fullscreen ? 'fullscreen' : ''} ${inline ? 'inline' : ''}`;

  const spinnerStyle = {
    width: sizeStyle.width,
    height: sizeStyle.height,
    borderWidth: sizeStyle.borderWidth,
  };

  return (
    <div className={containerClass}>
      <div className="spinner" style={spinnerStyle} />
      {message && <p className="spinner-message" style={{ fontSize: sizeStyle.fontSize }}>{message}</p>}
    </div>
  );
};

export default LoadingSpinner;