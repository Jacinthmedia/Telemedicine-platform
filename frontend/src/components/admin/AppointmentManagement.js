import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  Calendar, Search, Filter, Clock, CheckCircle, XCircle,
  AlertCircle, Eye, X, Loader, Stethoscope, User,
  PlayCircle, MoreVertical, Ban, Edit, RefreshCw, Download,
  Video, MessageSquare, DollarSign, TrendingUp,
} from 'lucide-react';
import './AppointmentManagement.css';

const AppointmentManagement = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [dateFilter, setDateFilter] = useState('all');

  // ============================================
  // FETCH
  // ============================================
  useEffect(() => {
    fetchAppointments();
    // eslint-disable-next-line
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/appointments/');
      const list = res.data.results || res.data.data || res.data || [];
      setAppointments(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FILTER
  // ============================================
  useEffect(() => {
    let list = [...appointments];

    if (activeFilter !== 'all') {
      list = list.filter((a) => a.status?.toLowerCase() === activeFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      list = list.filter((a) => {
        const d = new Date(a.appointment_date);
        if (dateFilter === 'today') return d.toDateString() === today.toDateString();
        if (dateFilter === 'week') {
          const weekEnd = new Date(today);
          weekEnd.setDate(today.getDate() + 7);
          return d >= today && d <= weekEnd;
        }
        if (dateFilter === 'month') {
          return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        }
        if (dateFilter === 'past') return d < today;
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => {
        const patient = `${a.patient?.user?.first_name || ''} ${a.patient?.user?.last_name || ''}`.toLowerCase();
        const doctor = `${a.doctor?.user?.first_name || ''} ${a.doctor?.user?.last_name || ''}`.toLowerCase();
        return (
          patient.includes(q) ||
          doctor.includes(q) ||
          a.reason?.toLowerCase().includes(q) ||
          a.diagnosis?.toLowerCase().includes(q)
        );
      });
    }

    list.sort((a, b) => {
      const da = new Date(`${a.appointment_date}T${a.start_time || '00:00'}`);
      const db = new Date(`${b.appointment_date}T${b.start_time || '00:00'}`);
      return db - da;
    });

    setFiltered(list);
  }, [appointments, activeFilter, searchQuery, dateFilter]);

  // ============================================
  // STATS
  // ============================================
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toDateString();

    return {
      total: appointments.length,
      today: appointments.filter((a) => new Date(a.appointment_date).toDateString() === todayStr).length,
      pending: appointments.filter((a) => a.status === 'pending').length,
      confirmed: appointments.filter((a) => a.status === 'confirmed').length,
      completed: appointments.filter((a) => a.status === 'completed').length,
      cancelled: appointments.filter((a) => a.status === 'cancelled').length,
    };
  }, [appointments]);

  // ============================================
  // ACTIONS
  // ============================================
  const performAction = async (id, action) => {
    setProcessing(id);
    setActionMenu(null);
    setError('');

    try {
      await api.post(`/appointments/${id}/${action}/`);
      const newStatus = {
        confirm: 'confirmed',
        start: 'in_progress',
        complete: 'completed',
        cancel: 'cancelled',
      }[action];

      if (newStatus) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
        );
      }
      setSuccess(`Appointment ${action}ed successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} appointment`);
    } finally {
      setProcessing(null);
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const formatTime = (t) => (t ? t.slice(0, 5) : '');

  const getStatusConfig = (status) => {
    const config = {
      pending: { bg: '#fef3c7', color: '#b45309', label: 'Pending' },
      confirmed: { bg: '#dbeafe', color: '#1d4ed8', label: 'Confirmed' },
      in_progress: { bg: '#ede9fe', color: '#7c3aed', label: 'In Progress' },
      completed: { bg: '#d1fae5', color: '#059669', label: 'Completed' },
      cancelled: { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled' },
    };
    return config[status?.toLowerCase()] || config.pending;
  };

  const getInitials = (user) => {
    const f = user?.first_name?.[0] || '';
    const l = user?.last_name?.[0] || '';
    return (f + l).toUpperCase() || 'U';
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="am-page">
      {/* Header */}
      <div className="am-header">
        <div>
          <h1>Appointment Management</h1>
          <p>Monitor and manage all appointments across the platform</p>
        </div>
        <button className="am-btn-secondary" onClick={fetchAppointments} title="Refresh">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="am-stats">
        <div className="am-stat" onClick={() => { setActiveFilter('all'); setDateFilter('all'); }}>
          <div className="am-stat-icon blue"><Calendar size={18} /></div>
          <div>
            <p>Total</p>
            <h3>{stats.total}</h3>
          </div>
        </div>
        <div className="am-stat" onClick={() => { setDateFilter('today'); setActiveFilter('all'); }}>
          <div className="am-stat-icon green"><TrendingUp size={18} /></div>
          <div>
            <p>Today</p>
            <h3>{stats.today}</h3>
          </div>
        </div>
        <div className="am-stat" onClick={() => setActiveFilter('pending')}>
          <div className="am-stat-icon amber"><Clock size={18} /></div>
          <div>
            <p>Pending</p>
            <h3>{stats.pending}</h3>
          </div>
        </div>
        <div className="am-stat" onClick={() => setActiveFilter('confirmed')}>
          <div className="am-stat-icon purple"><CheckCircle size={18} /></div>
          <div>
            <p>Confirmed</p>
            <h3>{stats.confirmed}</h3>
          </div>
        </div>
        <div className="am-stat" onClick={() => setActiveFilter('completed')}>
          <div className="am-stat-icon teal"><CheckCircle size={18} /></div>
          <div>
            <p>Completed</p>
            <h3>{stats.completed}</h3>
          </div>
        </div>
        <div className="am-stat" onClick={() => setActiveFilter('cancelled')}>
          <div className="am-stat-icon red"><XCircle size={18} /></div>
          <div>
            <p>Cancelled</p>
            <h3>{stats.cancelled}</h3>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="am-toolbar">
        <div className="am-filters">
          <Filter size={15} />
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((f) => (
            <button
              key={f.id}
              className={`am-filter-tab ${activeFilter === f.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="am-toolbar-right">
          <select
            className="am-date-filter"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="past">Past</option>
          </select>

          <div className="am-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search patient, doctor, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Banners */}
      {error && (
        <div className="am-banner error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="am-banner success">
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="am-loading">
          <Loader size={28} className="spin" />
          <p>Loading appointments...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="am-empty">
          <Calendar size={56} />
          <h3>No appointments found</h3>
          <p>Try adjusting filters or search.</p>
        </div>
      ) : (
        <div className="am-table">
          <div className="am-table-header">
            <div>Date & Time</div>
            <div>Patient</div>
            <div>Doctor</div>
            <div>Type</div>
            <div>Status</div>
            <div>Payment</div>
            <div></div>
          </div>

          {filtered.map((appt) => {
            const statusCfg = getStatusConfig(appt.status);
            const isProcessing = processing === appt.id;

            return (
              <div key={appt.id} className="am-row">
                <div className="am-cell date-cell">
                  <div className="am-date-badge">
                    <span className="am-date-day">
                      {new Date(appt.appointment_date).getDate()}
                    </span>
                    <span className="am-date-month">
                      {new Date(appt.appointment_date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>
                  <div>
                    <strong>
                      <Clock size={11} /> {formatTime(appt.start_time)}
                    </strong>
                    <span>
                      {new Date(appt.appointment_date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                </div>

                <div className="am-cell">
                  <div className="am-person">
                    <div className="am-avatar patient">
                      {getInitials(appt.patient?.user)}
                    </div>
                    <div>
                      <strong>
                        {appt.patient?.user?.first_name} {appt.patient?.user?.last_name}
                      </strong>
                      <span>@{appt.patient?.user?.username || 'patient'}</span>
                    </div>
                  </div>
                </div>

                <div className="am-cell">
                  <div className="am-person">
                    <div className="am-avatar doctor">
                      {getInitials(appt.doctor?.user)}
                    </div>
                    <div>
                      <strong>
                        Dr. {appt.doctor?.user?.first_name} {appt.doctor?.user?.last_name}
                      </strong>
                      <span>{appt.doctor?.specialization || 'General'}</span>
                    </div>
                  </div>
                </div>

                <div className="am-cell">
                  <span className={`am-type-tag type-${appt.consultation_type || 'video'}`}>
                    {appt.consultation_type === 'video' && <Video size={11} />}
                    {appt.consultation_type === 'chat' && <MessageSquare size={11} />}
                    {appt.consultation_type || 'video'}
                  </span>
                </div>

                <div className="am-cell">
                  <span
                    className="am-status-badge"
                    style={{ background: statusCfg.bg, color: statusCfg.color }}
                  >
                    {statusCfg.label}
                  </span>
                </div>

                <div className="am-cell payment-cell">
                  {appt.is_paid ? (
                    <span className="am-payment paid">
                      <CheckCircle size={12} /> Paid
                    </span>
                  ) : (
                    <span className="am-payment unpaid">
                      <Clock size={12} /> Unpaid
                    </span>
                  )}
                </div>

                <div className="am-cell am-actions-cell">
                  <button
                    className="am-icon-btn"
                    onClick={() => setSelected(appt)}
                    title="View details"
                  >
                    <Eye size={15} />
                  </button>
                  <div className="am-menu-wrap">
                    <button
                      className="am-icon-btn"
                      onClick={() =>
                        setActionMenu(actionMenu === appt.id ? null : appt.id)
                      }
                    >
                      <MoreVertical size={15} />
                    </button>

                    {actionMenu === appt.id && (
                      <div className="am-menu">
                        <button
                          onClick={() => {
                            setActionMenu(null);
                            navigate(`/appointments/${appt.id}`);
                          }}
                        >
                          <Edit size={13} /> Edit
                        </button>
                        {appt.status === 'pending' && (
                          <button
                            className="success"
                            disabled={isProcessing}
                            onClick={() => performAction(appt.id, 'confirm')}
                          >
                            <CheckCircle size={13} /> Confirm
                          </button>
                        )}
                        {appt.status === 'confirmed' && (
                          <button
                            className="primary"
                            disabled={isProcessing}
                            onClick={() => performAction(appt.id, 'start')}
                          >
                            <PlayCircle size={13} /> Start
                          </button>
                        )}
                        {appt.status === 'in_progress' && (
                          <button
                            className="success"
                            disabled={isProcessing}
                            onClick={() => performAction(appt.id, 'complete')}
                          >
                            <CheckCircle size={13} /> Complete
                          </button>
                        )}
                        {['pending', 'confirmed', 'in_progress'].includes(appt.status) && (
                          <button
                            className="danger"
                            disabled={isProcessing}
                            onClick={() => {
                              if (window.confirm('Cancel this appointment?')) {
                                performAction(appt.id, 'cancel');
                              }
                            }}
                          >
                            <Ban size={13} /> Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ DETAIL MODAL ============ */}
      {selected && (
        <div className="am-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="am-modal" onClick={(e) => e.stopPropagation()}>
            <div className="am-modal-header">
              <div>
                <p>Appointment #{selected.id}</p>
                <h2>
                  {formatDate(selected.appointment_date)} at {formatTime(selected.start_time)}
                </h2>
                <span
                  className="am-modal-status"
                  style={{
                    background: getStatusConfig(selected.status).bg,
                    color: getStatusConfig(selected.status).color,
                  }}
                >
                  {getStatusConfig(selected.status).label}
                </span>
              </div>
              <button className="am-modal-close" onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="am-modal-body">
              {/* Participants */}
              <div className="am-modal-section">
                <h4>Participants</h4>
                <div className="am-modal-person">
                  <div className="am-avatar patient lg">
                    {getInitials(selected.patient?.user)}
                  </div>
                  <div>
                    <strong>Patient</strong>
                    <p>
                      {selected.patient?.user?.first_name}{' '}
                      {selected.patient?.user?.last_name}
                    </p>
                    <span>{selected.patient?.user?.email}</span>
                  </div>
                </div>
                <div className="am-modal-person">
                  <div className="am-avatar doctor lg">
                    {getInitials(selected.doctor?.user)}
                  </div>
                  <div>
                    <strong>Doctor</strong>
                    <p>
                      Dr. {selected.doctor?.user?.first_name}{' '}
                      {selected.doctor?.user?.last_name}
                    </p>
                    <span>{selected.doctor?.specialization}</span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="am-modal-section">
                <h4>Details</h4>
                <div className="am-modal-row">
                  <span>Date</span>
                  <strong>{formatDate(selected.appointment_date)}</strong>
                </div>
                <div className="am-modal-row">
                  <span>Time</span>
                  <strong>
                    {formatTime(selected.start_time)} — {formatTime(selected.end_time)}
                  </strong>
                </div>
                <div className="am-modal-row">
                  <span>Type</span>
                  <strong>{selected.consultation_type}</strong>
                </div>
                <div className="am-modal-row">
                  <span>Duration</span>
                  <strong>{selected.duration || 30} minutes</strong>
                </div>
                <div className="am-modal-row">
                  <span>Payment</span>
                  <strong style={{ color: selected.is_paid ? '#10b981' : '#f59e0b' }}>
                    {selected.is_paid ? 'Paid' : 'Unpaid'}
                  </strong>
                </div>
              </div>

              {/* Reason */}
              {selected.reason && (
                <div className="am-modal-section">
                  <h4>Reason for Visit</h4>
                  <p className="am-modal-text">{selected.reason}</p>
                </div>
              )}

              {selected.symptoms && (
                <div className="am-modal-section">
                  <h4>Symptoms</h4>
                  <p className="am-modal-text">{selected.symptoms}</p>
                </div>
              )}

              {selected.diagnosis && (
                <div className="am-modal-section">
                  <h4>Diagnosis</h4>
                  <p className="am-modal-text">{selected.diagnosis}</p>
                </div>
              )}

              {selected.notes && (
                <div className="am-modal-section">
                  <h4>Notes</h4>
                  <p className="am-modal-text">{selected.notes}</p>
                </div>
              )}
            </div>

            <div className="am-modal-footer">
              <button className="am-btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
              {['pending', 'confirmed', 'in_progress'].includes(selected.status) && (
                <button
                  className="am-btn-danger"
                  onClick={() => {
                    if (window.confirm('Cancel this appointment?')) {
                      performAction(selected.id, 'cancel');
                      setSelected(null);
                    }
                  }}
                >
                  <Ban size={14} /> Cancel Appointment
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentManagement;