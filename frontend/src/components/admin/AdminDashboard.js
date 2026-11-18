import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axios';
import {
  FaUsers,
  FaCalendarCheck,
  FaFileMedical,
  FaPills,
  FaUserMd,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import '../dashboard/Dashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await api.get('/admin/dashboard/');
      // Backend wraps the payload as { success, data: {...} },
      // matching the same convention as every other endpoint in
      // this app (patients/dashboard/, doctors/dashboard/, etc.)
      setStats(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const statsVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const statItems = [
    {
      key: 'total_patients',
      title: 'Total Patients',
      icon: FaUsers,
      color: 'green',
      bgColor: '#f0fdf4',
      iconColor: '#16a34a',
    },
    {
      key: 'upcoming_appointments',
      title: 'Upcoming Appointments',
      icon: FaCalendarCheck,
      color: 'blue',
      bgColor: '#eff6ff',
      iconColor: '#3b82f6',
    },
    {
      key: 'total_medical_records',
      title: 'Medical Records',
      icon: FaFileMedical,
      color: 'purple',
      bgColor: '#f5f3ff',
      iconColor: '#7c3aed',
    },
    {
      key: 'active_prescriptions',
      title: 'Active Prescriptions',
      icon: FaPills,
      color: 'orange',
      bgColor: '#fffbeb',
      iconColor: '#d97706',
    },
    {
      key: 'total_doctors',
      title: 'Total Doctors',
      icon: FaUserMd,
      color: 'teal',
      bgColor: '#f0fdfa',
      iconColor: '#0d9488',
    },
    {
      key: 'completion_rate',
      title: 'Completion Rate',
      icon: FaChartLine,
      color: 'emerald',
      bgColor: '#ecfdf5',
      iconColor: '#059669',
      suffix: '%',
    },
  ];

  // Loading Skeleton
  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-skeleton">
          <div className="skeleton-header"></div>
          <div className="skeleton-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
              </div>
            ))}
          </div>
          <div className="skeleton-content">
            <div className="skeleton-card large"></div>
            <div className="skeleton-card"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-icon">âš ï¸</div>
        <h3>Something went wrong</h3>
        <p>{error}</p>
        <button className="btn-retry" onClick={loadDashboard}>
          Try Again
        </button>
      </div>
    );
  }

  // Get value from stats
  const getValue = (key) => {
    if (!stats) return 0;
    const statMap = {
      total_patients: stats.statistics?.total_patients || 0,
      upcoming_appointments: stats.statistics?.upcoming_appointments || 0,
      total_medical_records: stats.statistics?.total_medical_records || 0,
      active_prescriptions: stats.statistics?.active_prescriptions || 0,
      total_doctors: stats.statistics?.total_doctors || 0,
      completion_rate: stats.statistics?.completion_rate || 0,
    };
    return statMap[key] || 0;
  };

  // Recent activities from API
  const activities = stats?.upcoming_appointments?.slice(0, 4).map((appt) => ({
    id: appt.id,
    icon: 'ðŸ“…',
    text: `Appointment with Dr. ${appt.doctor_name}`,
    time: new Date(appt.scheduled_time).toLocaleString(),
    status: appt.status,
    type: 'appointment',
  })) || [];

  // Quick Actions
  const quickActions = [
    { icon: 'ðŸ“‹', label: 'New Record', color: '#16a34a' },
    { icon: 'ðŸ’Š', label: 'Prescribe', color: '#7c3aed' },
    { icon: 'ðŸ“…', label: 'Schedule', color: '#3b82f6' },
    { icon: 'ðŸ“„', label: 'Report', color: '#d97706' },
  ];

  return (
    <motion.div
      className="dashboard-container"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Section */}
      <motion.div className="dashboard-welcome" variants={itemVariants}>
        <div className="welcome-content">
          <div className="welcome-text">
            <h1 className="welcome-title">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, ðŸ‘‹
            </h1>
            <h2 className="welcome-subtitle">
              {user?.first_name || user?.username}
            </h2>
            <p className="welcome-description">
              Here's what's happening with your health practice today.
            </p>
          </div>
          <div className="welcome-stats-mini">
            <div className="mini-stat">
              <span className="mini-stat-value">
                {stats?.statistics?.today_appointments || 0}
              </span>
              <span className="mini-stat-label">Today</span>
            </div>
            <div className="mini-stat">
              <span className="mini-stat-value">
                {stats?.statistics?.pending_appointments || 0}
              </span>
              <span className="mini-stat-label">Pending</span>
            </div>
            <div className="mini-stat">
              <span className="mini-stat-value">
                {stats?.statistics?.total_patients || 0}
              </span>
              <span className="mini-stat-label">Total Patients</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div className="stats-grid" variants={containerVariants}>
        {statItems.map((stat) => {
          const value = getValue(stat.key);
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.key}
              className={`stat-card stat-card-${stat.color}`}
              variants={statsVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className="stat-card-header">
                <div
                  className="stat-icon-wrapper"
                  style={{ background: stat.bgColor }}
                >
                  <Icon style={{ color: stat.iconColor }} />
                </div>
                <span className="stat-card-title">{stat.title}</span>
              </div>
              <div className="stat-card-body">
                <CountUp
                  start={0}
                  end={value}
                  duration={1.2}
                  separator=","
                  suffix={stat.suffix || ''}
                  className="stat-card-value"
                />
                <div className="stat-trend">
                  <span className={`trend-indicator ${value > 0 ? 'up' : 'down'}`}>
                    {value > 0 ? <FaArrowUp /> : <FaArrowDown />}
                  </span>
                  <span className="trend-label">
                    {value > 0 ? `+${value}` : `${value}`}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Bottom Grid */}
      <motion.div className="dashboard-grid" variants={containerVariants}>
        {/* Recent Activity */}
        <motion.div className="dashboard-card activity-card" variants={itemVariants}>
          <div className="card-header">
            <h3 className="card-title">Recent Activity</h3>
            <button className="card-action-btn">View All â†’</button>
          </div>
          <div className="activity-list">
            <AnimatePresence>
              {activities.length > 0 ? (
                activities.map((activity, index) => (
                  <motion.div
                    key={activity.id || index}
                    className="activity-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ x: 4, transition: { duration: 0.2 } }}
                  >
                    <div className="activity-icon-wrapper">
                      <span className="activity-icon">{activity.icon}</span>
                    </div>
                    <div className="activity-content">
                      <p className="activity-text">{activity.text}</p>
                      <span className="activity-time">
                        <FaClock className="time-icon" /> {activity.time}
                      </span>
                    </div>
                    <span className={`status-badge ${activity.status}`}>
                      {activity.status}
                    </span>
                  </motion.div>
                ))
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">ðŸ“­</span>
                  <p className="empty-text">No recent activity</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div className="dashboard-card quick-actions-card" variants={itemVariants}>
          <h3 className="card-title">Quick Actions</h3>
          <div className="quick-actions-grid">
            {quickActions.map((action, index) => (
              <motion.button
                key={index}
                className="quick-action-btn"
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{ '--hover-color': action.color }}
              >
                <span className="quick-icon">{action.icon}</span>
                <span className="quick-label">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;
