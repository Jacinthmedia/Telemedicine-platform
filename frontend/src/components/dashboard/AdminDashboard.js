
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/axios';

import {
  Users,
  Stethoscope,
  Calendar,
  DollarSign,
  Activity,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  Clock,
  UserRound,
  AlertCircle
} from 'lucide-react';

import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

import './AdminDashboard.css';

const COLORS = [
  '#08A879',
  '#087B5C',
  '#42C99B',
  '#73DDB5',
  '#B2EBD3'
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09
    }
  }
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 24
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const res = await api.get('/admin/dashboard/');
      setData(res.data?.data || res.data);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);

      setError(
        err.response?.data?.detail ||
        'Unable to load dashboard information. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const statistics = data?.statistics || {};
  const charts = data?.charts || {};
  const recentUsers = data?.recent_users || [];
  const pendingVerifications = data?.pending_verifications || [];

  const revenueData = charts.revenue_14d || [];
  const specializationData = charts.specializations || [];

  const formattedDate = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  if (loading) {
    return (
      <div className="admin-dashboard admin-loading">
        <div className="admin-loading-heading">
          <div className="admin-skeleton admin-skeleton-title" />
          <div className="admin-skeleton admin-skeleton-subtitle" />
        </div>

        <div className="admin-loading-grid">
          {[1, 2, 3, 4].map((item) => (
            <div className="admin-skeleton admin-skeleton-card" key={item} />
          ))}
        </div>

        <div className="admin-loading-grid admin-loading-charts">
          <div className="admin-skeleton admin-skeleton-chart" />
          <div className="admin-skeleton admin-skeleton-chart" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="admin-dashboard">
        <div className="admin-error-card">
          <div className="admin-error-icon">
            <AlertCircle size={28} />
          </div>

          <h2>Dashboard unavailable</h2>
          <p>{error || 'We could not retrieve your dashboard data.'}</p>

          <button
            className="admin-btn-primary"
            onClick={() => fetchDashboard()}
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="admin-dashboard"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* HERO */}
      <motion.section className="admin-hero" variants={itemVariants}>
        <div className="admin-hero-content">
          <div className="admin-eyebrow">
            <span className="admin-live-dot" />
            ADMINISTRATION OVERVIEW
          </div>

          <h1>
            Your platform,
            <span> at a glance.</span>
          </h1>

          <p>
            Monitor your healthcare network, track performance
            and manage your platform from one place.
          </p>

          <div className="admin-hero-date">
            <Clock size={15} />
            <span>{formattedDate}</span>
          </div>
        </div>

        <div className="admin-hero-actions">
          <button
            className="admin-btn-glass"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'admin-spin' : ''}
            />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <Link to="/admin/users" className="admin-btn-light">
            Manage users
            <ArrowUpRight size={16} />
          </Link>
        </div>

        <div className="admin-hero-orb admin-hero-orb-one" />
        <div className="admin-hero-orb admin-hero-orb-two" />
      </motion.section>

      {/* STATISTICS */}
      <motion.section
        className="admin-stats-grid"
        variants={containerVariants}
      >
        <StatCard
          icon={<Users size={22} />}
          label="Total users"
          value={statistics.total_users ?? 0}
          color="blue"
          description="Registered accounts"
        />

        <StatCard
          icon={<Stethoscope size={22} />}
          label="Total doctors"
          value={statistics.total_doctors ?? 0}
          color="green"
          description="Healthcare professionals"
        />

        <StatCard
          icon={<Calendar size={22} />}
          label="Appointments"
          value={statistics.total_appointments ?? 0}
          color="orange"
          description="Platform appointments"
        />

        <StatCard
          icon={<DollarSign size={22} />}
          label="Total revenue"
          value={`$${statistics.total_revenue ?? 0}`}
          color="purple"
          description="Recorded platform revenue"
          isText
        />
      </motion.section>

      {/* CHARTS */}
      <section className="admin-charts-grid">
        <motion.div
          className="admin-chart-card admin-revenue-card"
          variants={itemVariants}
        >
          <div className="admin-section-heading">
            <div>
              <span className="admin-section-kicker">FINANCIAL PERFORMANCE</span>
              <h3>Revenue overview</h3>
              <p>Your revenue activity over the last 14 days.</p>
            </div>

            <div className="admin-chart-icon">
              <Activity size={19} />
            </div>
          </div>

          <div className="admin-chart-container">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={revenueData}
                  margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="adminRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#08A879" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#08A879" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="4 5"
                    vertical={false}
                    stroke="#EAF1ED"
                  />

                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#87968F', fontSize: 11 }}
                    tickMargin={12}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#87968F', fontSize: 11 }}
                  />

                  <Tooltip
                    contentStyle={{
                      borderRadius: '14px',
                      border: '1px solid #E3EEE8',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
                    }}
                    formatter={(value) => [`$${value}`, 'Revenue']}
                  />

                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#08A879"
                    strokeWidth={3}
                    fill="url(#adminRevenueGradient)"
                    activeDot={{
                      r: 6,
                      fill: '#087B5C',
                      stroke: '#FFFFFF',
                      strokeWidth: 3
                    }}
                    animationDuration={1400}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No revenue chart data available yet." />
            )}
          </div>
        </motion.div>

        <motion.div
          className="admin-chart-card admin-specialization-card"
          variants={itemVariants}
        >
          <div className="admin-section-heading">
            <div>
              <span className="admin-section-kicker">MEDICAL NETWORK</span>
              <h3>Top specializations</h3>
              <p>Doctor distribution by specialization.</p>
            </div>

            <div className="admin-chart-icon">
              <Stethoscope size={19} />
            </div>
          </div>

          <div className="admin-pie-container">
            {specializationData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={specializationData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={4}
                    cornerRadius={5}
                    animationDuration={1200}
                  >
                    {specializationData.map((entry, index) => (
                      <Cell
                        key={`specialization-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="none"
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                  <Legend
                    verticalAlign="bottom"
                    height={45}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No specialization data available yet." />
            )}
          </div>
        </motion.div>
      </section>

      {/* MANAGEMENT LISTS */}
      <section className="admin-lists-grid">
        <motion.div
          className="admin-list-card"
          variants={itemVariants}
        >
          <div className="admin-list-heading">
            <div>
              <span className="admin-section-kicker">ACTION REQUIRED</span>
              <h3>Doctor verification</h3>
              <p>Review professionals awaiting approval.</p>
            </div>

            <div className="admin-count-badge">
              {pendingVerifications.length}
            </div>
          </div>

          <div className="admin-list-content">
            {pendingVerifications.length === 0 ? (
              <EmptyList message="No pending doctor verifications." />
            ) : (
              <AnimatePresence>
                {pendingVerifications.map((doctor) => (
                  <motion.div
                    key={doctor.id}
                    className="admin-list-item"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, x: -15 }}
                    layout
                  >
                    <div className="admin-user-avatar doctor-avatar">
                      <Stethoscope size={19} />
                    </div>

                    <div className="admin-user-info">
                      <h4>{doctor.name || 'Doctor'}</h4>
                      <p>{doctor.specialization || 'Specialization not provided'}</p>
                    </div>

                    <Link
                      to="/admin/doctor-verification"
                      className="admin-btn-review"
                    >
                      Review
                      <ArrowUpRight size={14} />
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>

        <motion.div
          className="admin-list-card"
          variants={itemVariants}
        >
          <div className="admin-list-heading">
            <div>
              <span className="admin-section-kicker">COMMUNITY</span>
              <h3>Recent signups</h3>
              <p>Latest members joining your platform.</p>
            </div>

            <Link to="/admin/users" className="admin-view-all">
              View all
              <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className="admin-list-content">
            {recentUsers.length === 0 ? (
              <EmptyList message="No recent registrations available." />
            ) : (
              <AnimatePresence>
                {recentUsers.map((user) => (
                  <motion.div
                    key={user.id}
                    className="admin-list-item"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    layout
                  >
                    <div className="admin-user-avatar patient-avatar">
                      <UserRound size={19} />
                    </div>

                    <div className="admin-user-info">
                      <h4>{user.name || 'New user'}</h4>
                      <p>{user.email}</p>
                    </div>

                    <span className={`role-badge ${user.role || 'unknown'}`}>
                      {user.role || 'Unknown'}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <motion.div className="admin-dashboard-footer" variants={itemVariants}>
        <div className="admin-footer-status">
          <span className="admin-live-dot" />
          Dashboard connected
        </div>

        <span>MediCare Administration</span>
      </motion.div>
    </motion.div>
  );
};


/* ============================================================
   ANIMATED STAT CARD
============================================================ */

const StatCard = ({
  icon,
  label,
  value,
  color,
  description,
  isText = false
}) => (
  <motion.div
    className="admin-stat-card"
    variants={itemVariants}
    whileHover={{
      y: -7,
      transition: { duration: 0.25 }
    }}
  >
    <div className="admin-stat-top">
      <div className={`admin-stat-icon ${color}`}>
        {icon}
      </div>

      <div className="admin-stat-arrow">
        <ArrowUpRight size={17} />
      </div>
    </div>

    <div className="admin-stat-details">
      <span className="admin-stat-label">{label}</span>

      <h2 className={`admin-stat-value ${isText ? 'admin-stat-revenue' : ''}`}>
        {value}
      </h2>

      <p>{description}</p>
    </div>
  </motion.div>
);


/* ============================================================
   EMPTY STATES
============================================================ */

const EmptyChart = ({ message }) => (
  <div className="admin-empty-state">
    <Activity size={25} />
    <p>{message}</p>
  </div>
);

const EmptyList = ({ message }) => (
  <div className="admin-empty-state admin-empty-list">
    <ShieldCheck size={25} />
    <p>{message}</p>
  </div>
);

export default AdminDashboard;
