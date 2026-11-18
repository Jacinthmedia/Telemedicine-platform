import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Video, Phone, Clock, User, Calendar, Search, Filter,
  CheckCircle, XCircle, Loader, AlertCircle, Play,
  Download, ExternalLink, MessageSquare, TrendingUp,
} from 'lucide-react';
import './CallHistory.css';

const CallHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || 'patient';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [calls, setCalls] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ============================================
  // FETCH
  // ============================================
  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/video-calls/call-history/');
      const list = res.data.data || res.data.results || res.data || [];
      setCalls(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load call history:', err);
      setError('Failed to load call history');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FILTER
  // ============================================
  useEffect(() => {
    let list = [...calls];

    if (activeFilter !== 'all') {
      list = list.filter((c) => c.status === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => {
        const patient = c.patient_name?.toLowerCase() || '';
        const doctor = c.doctor_name?.toLowerCase() || '';
        return patient.includes(q) || doctor.includes(q);
      });
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setFiltered(list);
  }, [calls, activeFilter, searchQuery]);

  // ============================================
  // STATS
  // ============================================
  const stats = useMemo(() => {
    const totalDuration = calls.reduce(
      (s, c) => s + (c.duration_seconds || 0),
      0
    );
    return {
      total: calls.length,
      completed: calls.filter((c) => c.status === 'ended').length,
      totalDuration,
      avgDuration: calls.length ? Math.round(totalDuration / calls.length) : 0,
    };
  }, [calls]);

  // ============================================
  // HELPERS
  // ============================================
  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const formatTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h}h ${m % 60}m`;
    }
    return `${m}m ${s}s`;
  };

  const getStatusConfig = (status) => {
    const c = {
      pending: { bg: '#fef3c7', color: '#b45309', label: 'Pending' },
      active: { bg: '#dbeafe', color: '#1d4ed8', label: 'Active' },
      ended: { bg: '#d1fae5', color: '#059669', label: 'Completed' },
      failed: { bg: '#fee2e2', color: '#dc2626', label: 'Failed' },
      cancelled: { bg: '#f1f5f9', color: '#64748b', label: 'Cancelled' },
    };
    return c[status?.toLowerCase()] || c.pending;
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="ch-page">
      {/* Header */}
      <div className="ch-header">
        <div>
          <h1>Call History</h1>
          <p>
            {role === 'doctor'
              ? 'Review your past video consultations with patients.'
              : 'See your previous consultations with doctors.'}
          </p>
        </div>
        <button className="ch-btn-secondary" onClick={fetchCalls}>
          <Loader size={15} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      <div className="ch-stats">
        <div className="ch-stat">
          <div className="ch-stat-icon green">
            <Video size={20} />
          </div>
          <div>
            <p>Total Calls</p>
            <h3>{stats.total}</h3>
          </div>
        </div>
        <div className="ch-stat">
          <div className="ch-stat-icon blue">
            <CheckCircle size={20} />
          </div>
          <div>
            <p>Completed</p>
            <h3>{stats.completed}</h3>
          </div>
        </div>
        <div className="ch-stat">
          <div className="ch-stat-icon purple">
            <Clock size={20} />
          </div>
          <div>
            <p>Total Duration</p>
            <h3>{formatDuration(stats.totalDuration)}</h3>
          </div>
        </div>
        <div className="ch-stat">
          <div className="ch-stat-icon amber">
            <TrendingUp size={20} />
          </div>
          <div>
            <p>Avg. Duration</p>
            <h3>{formatDuration(stats.avgDuration)}</h3>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="ch-banner error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="ch-toolbar">
        <div className="ch-filters">
          <Filter size={15} />
          {['all', 'ended', 'active', 'pending', 'cancelled'].map((f) => (
            <button
              key={f}
              className={`ch-filter-tab ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f === 'ended' ? 'Completed' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="ch-search">
          <Search size={15} />
          <input
            type="text"
            placeholder={role === 'doctor' ? 'Search patients...' : 'Search doctors...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="ch-loading">
          <Loader size={28} className="spin" />
          <p>Loading call history...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ch-empty">
          <Video size={48} />
          <h3>No calls found</h3>
          <p>
            {calls.length === 0
              ? 'You have no video consultations yet.'
              : 'No calls match your filters.'}
          </p>
        </div>
      ) : (
        <div className="ch-list">
          {filtered.map((call) => {
            const cfg = getStatusConfig(call.status);
            const isDoctor = role === 'doctor';
            const otherPerson = isDoctor ? call.patient_name : `Dr. ${call.doctor_name}`;

            return (
              <div key={call.id} className="ch-card">
                <div className={`ch-avatar ${isDoctor ? 'patient' : 'doctor'}`}>
                  {(otherPerson || 'U')
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>

                <div className="ch-body">
                  <div className="ch-body-top">
                    <h4>{otherPerson || 'Unknown'}</h4>
                    <span
                      className="ch-status-badge"
                      style={{ background: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  <div className="ch-body-meta">
                    <span>
                      <Calendar size={12} /> {formatDate(call.created_at)}
                    </span>
                    <span>
                      <Clock size={12} /> {formatTime(call.created_at)}
                    </span>
                    {call.duration_seconds > 0 && (
                      <span className="ch-duration">
                        <Video size={12} /> {formatDuration(call.duration_seconds)}
                      </span>
                    )}
                    {call.appointment_details?.appointment_id && (
                      <span className="ch-appt-ref">
                        Appt #{call.appointment_details.appointment_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="ch-actions">
                  {call.recording_url && (
                    <a
                      className="ch-icon-btn"
                      href={call.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Download recording"
                    >
                      <Download size={15} />
                    </a>
                  )}
                  {call.appointment && (
                    <button
                      className="ch-icon-btn"
                      onClick={() => navigate(`/appointments/${call.appointment}`)}
                      title="View appointment"
                    >
                      <ExternalLink size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CallHistory;
