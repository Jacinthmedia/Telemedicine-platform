import React from 'react';
import { motion } from 'framer-motion';
import './StatsCard.css';

const StatsCard = ({ title, value, icon, change, changeLabel, color = 'green' }) => {
  const isPositive = change && change > 0;
  const changeColor = isPositive ? 'var(--success)' : change < 0 ? 'var(--error)' : 'var(--text-muted)';
  const changeIcon = isPositive ? '↑' : change < 0 ? '↓' : '→';

  return (
    <motion.div 
      className="stats-card"
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="stats-card-header">
        <span className={`stats-card-icon ${color}`}>{icon}</span>
        <span className="stats-card-title">{title}</span>
      </div>
      <div className="stats-card-body">
        <motion.span 
          className="stats-card-value"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {value}
        </motion.span>
        {change !== undefined && (
          <div className="stats-card-change">
            <motion.span 
              className="change-value" 
              style={{ color: changeColor }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {changeIcon} {Math.abs(change)}%
            </motion.span>
            <span className="change-label">{changeLabel}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StatsCard;