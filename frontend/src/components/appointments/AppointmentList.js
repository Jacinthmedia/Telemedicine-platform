import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import ReviewForm from './ReviewForm';
import {
  Calendar,
  Clock,
  Search,
  Filter,
  Video,
  Phone,
  MessageSquare,
  User,
  Stethoscope,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle,
  MoreVertical,
  X,
  Plus,
  RefreshCw,
  DollarSign,
  Star,
} from 'lucide-react';
import './AppointmentList.css';

const AppointmentList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || 'patient';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMenuId, setActionMenuId] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [reviewingAppointment, setReviewingAppointment] = useState(null);

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
      const data = res.data.results || res.data.data || res.data || [];
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading appointments:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to load appointments'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FILTER & SEARCH
  // ============================================
  const filteredAppointments = useMemo(() => {
    let list = [...appointments];

    if (activeFilter !== 'all') {
      list = list.filter((a) => a.status?.toLowerCase() === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => {
        const patientName =
          `${a.patient?.user?.first_name || ''} ${a.patient?.user?.last_name || ''}`.toLowerCase();
        const doctorName =
          `${a.doctor?.user?.first_name || ''} ${a.doctor?.user?.last_name || ''}`.toLowerCase();
        return (
          patientName.includes(q) ||
          doctorName.includes(q) ||
          a.reason?.toLowerCase().includes(q)
        );
      });
    }

    return list.sort((a, b) => {
      const da = new Date(`${a.appointment_date}T${a.start_time || '00:00'}`);
      const db = new Date(`${b.appointment_date}T${b.start_time || '00:00'}`);
      return db - da;
    });
  }, [appointments, activeFilter, searchQuery]);

  // ============================================
  // COUNTS
  // ============================================
  const counts = useMemo(() => {
    const c = {
      all: appointments.length,
      pending: 0,
      confirmed: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };
    appointments.forEach((a) => {
      const s = a.status?.toLowerCase();
      if (c[s] !== undefined) c[s]++;
    });
    return c;
  }, [appointments]);

  // ============================================
  // ACTIONS
  // ============================================
  const performAction = async (appointmentId, action) => {
    setProcessing(appointmentId);
    setActionMenuId(null);
    try {
      await api.post(`/appointments/${appointmentId}/${action}/`);
      const newStatus =
        action === 'confirm' ? 'confirmed'
        : action === 'start' ? 'in_progress'
        : action === 'complete' ? 'completed'
        : action === 'cancel' ? 'cancelled'
        : null;
      if (newStatus) {
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === appointmentId ? { ...a, status: newStatus } : a
          )
        );
      }
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        `Failed to ${action} appointment`
      );
    } finally {
      setProcessing(null);
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const getStatusBadge = (status) => {
    const s = status?.toLowerCase();
    const config = {
      pending: { color: '#f59e0b', bg: '#fef3c7', label: 'Pending' },
      confirmed: { color: '#3b82f6', bg: '#dbeafe', label: 'Confirmed' },
      in_progress: { color: '#8b5cf6', bg: '#ede9fe', label: 'In Progress' },
      completed: { color: '#10b981', bg: '#d1fae5', label: 'Completed' },
      cancelled: { color: '#ef4444', bg: '#fee2e2', label: 'Cancelled' },
    };
    return config[s] || { color: '#64748b', bg: '#f1f5f9', label: status };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.slice(0, 5);
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="al-page">
      {/* Header */}
      <div className="al-header">
        <div>
          <h1>Appointments</h1>
          <p>
            {role === 'doctor'
              ? 'Manage your patient consultations'
              : role === 'admin'
              ? 'View and manage all appointments'
              : 'Your scheduled consultations'}
          </p>
        </div>
        <div className="al-header-actions">
          <button className="al-refresh" onClick={fetchAppointments} title="Refresh">
            <RefreshCw size={16} />
          </button>
          {role === 'patient' && (
            <button
              className="al-btn-primary"
              onClick={() => navigate('/appointments/book')}
            >
              <Plus size={16} />
              Book New
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="al-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="al-error-close">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="al-toolbar">
        <div className="al-filters">
          <Filter size={16} />
          {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map((f) => (
            <button
              key={f}
              className={`al-filter-tab ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f === 'all'
                ? 'All'
                : f === 'in_progress'
                ? 'In Progress'
                : f.charAt(0).toUpperCase() + f.slice(1)}
              {counts[f] > 0 && <span className="al-filter-count">{counts[f]}</span>}
            </button>
          ))}
        </div>

        <div className="al-search">
          <Search size={16} />
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
        <div className="al-loading">
          <div className="spinner" />
          <p>Loading appointments...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="al-empty">
          <Calendar size={48} />
          <h3>No appointments found</h3>
          <p>
            {appointments.length === 0
              ? role === 'patient'
                ? "You haven't booked any appointments yet."
                : 'No appointments to display.'
              : 'No appointments match your filters.'}
          </p>
          {role === 'patient' && appointments.length === 0 && (
            <button
              className="al-btn-primary"
              onClick={() => navigate('/appointments/book')}
            >
              <Plus size={16} />
              Book Your First Appointment
            </button>
          )}
        </div>
      ) : (
        <div className="al-list">
          {filteredAppointments.map((appt) => {
            const badge = getStatusBadge(appt.status);
            const isProcessing = processing === appt.id;
            const isPatient = role === 'patient';
            const isDoctor = role === 'doctor';
            const isAdmin = role === 'admin';
            const isAudio = appt.consultation_type === 'audio';
            const isVideo = appt.consultation_type === 'video';
            const isChat = appt.consultation_type === 'chat';
            const isCallType = isAudio || isVideo;
            const canJoin = appt.status === 'confirmed' || appt.status === 'in_progress';
            const canReview =
              isPatient &&
              appt.status === 'completed' &&
              !appt.has_review;

            return (
              <div key={appt.id} className="al-card">
                {/* Time */}
                <div className="al-card-time">
                  <div className="al-time-badge">
                    <Clock size={14} />
                    {formatTime(appt.start_time)}
                  </div>
                  <div className="al-date-text">
                    {formatDate(appt.appointment_date)}
                  </div>
                </div>

                {/* Main content */}
                <div className="al-card-main">
                  <div className="al-card-person">
                    <div className="al-avatar">
                      {isPatient ? (
                        <Stethoscope size={18} />
                      ) : (
                        (appt.patient?.user?.first_name?.[0] ||
                          appt.doctor?.user?.first_name?.[0] ||
                          'U').toUpperCase()
                      )}
                    </div>
                    <div>
                      {isPatient && appt.doctor && (
                        <>
                          <h4>
                            Dr. {appt.doctor.user?.first_name}{' '}
                            {appt.doctor.user?.last_name}
                          </h4>
                          <p>{appt.doctor.specialization || 'General'}</p>
                        </>
                      )}
                      {isDoctor && appt.patient && (
                        <>
                          <h4>
                            {appt.patient.user?.first_name}{' '}
                            {appt.patient.user?.last_name}
                          </h4>
                          <p>Patient</p>
                        </>
                      )}
                      {isAdmin && (
                        <>
                          <h4>
                            {appt.patient?.user?.first_name} → Dr.{' '}
                            {appt.doctor?.user?.last_name}
                          </h4>
                          <p>{appt.doctor?.specialization}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="al-card-meta">
                    <span className={`al-type-tag type-${appt.consultation_type}`}>
                      {isVideo && <Video size={12} />}
                      {isAudio && <Phone size={12} />}
                      {isChat && <MessageSquare size={12} />}
                      {appt.consultation_type || 'video'}
                    </span>
                    {appt.reason && (
                      <span className="al-reason">· {appt.reason}</span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="al-card-status">
                  <span
                    className="al-status-badge"
                    style={{ backgroundColor: badge.bg, color: badge.color }}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Actions */}
                <div className="al-card-actions">
                  {/* Patient: pay */}
                  {isPatient &&
                    !appt.is_paid &&
                    ['pending', 'confirmed'].includes(appt.status) && (
                      <button
                        className="al-btn-icon warning"
                        title="Pay Now"
                        onClick={() => navigate(`/payments/appointment/${appt.id}`)}
                      >
                        <DollarSign size={16} />
                      </button>
                    )}

                  {/* Patient: leave review */}
                  {canReview && (
                    <button
                      className="al-btn-icon star"
                      title="Leave a Review"
                      onClick={() => setReviewingAppointment(appt)}
                    >
                      <Star size={16} />
                    </button>
                  )}

                  {/* Patient: join call */}
                  {isPatient && canJoin && isCallType && (
                    <button
                      className="al-btn-icon primary"
                      title={isAudio ? 'Join Voice Call' : 'Join Video Call'}
                      onClick={() => navigate(`/video-call/${appt.id}`)}
                    >
                      {isAudio ? <Phone size={16} /> : <Video size={16} />}
                    </button>
                  )}

                  {/* Patient: chat */}
                  {isPatient && canJoin && isChat && (
                    <button
                      className="al-btn-icon primary"
                      title="Open Chat"
                      onClick={() => navigate(`/chat/${appt.doctor?.user?.id}`)}
                    >
                      <MessageSquare size={16} />
                    </button>
                  )}

                  {/* Doctor: pending → confirm */}
                  {isDoctor && appt.status === 'pending' && (
                    <button
                      className="al-btn-icon success"
                      disabled={isProcessing}
                      onClick={() => performAction(appt.id, 'confirm')}
                      title="Confirm"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}

                  {/* Doctor: confirmed → join or start */}
                  {isDoctor && appt.status === 'confirmed' && (
                    <>
                      {isCallType && (
                        <button
                          className="al-btn-icon primary"
                          title={isAudio ? 'Start Voice Call' : 'Start Video Call'}
                          onClick={() => navigate(`/video-call/${appt.id}`)}
                        >
                          {isAudio ? <Phone size={16} /> : <Video size={16} />}
                        </button>
                      )}
                      <button
                        className="al-btn-icon success"
                        disabled={isProcessing}
                        onClick={() => performAction(appt.id, 'start')}
                        title="Start"
                      >
                        <PlayCircle size={16} />
                      </button>
                    </>
                  )}

                  {/* Doctor: in_progress → complete */}
                  {isDoctor && appt.status === 'in_progress' && (
                    <button
                      className="al-btn-icon success"
                      disabled={isProcessing}
                      onClick={() => performAction(appt.id, 'complete')}
                      title="Mark Complete"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}

                  {/* More menu */}
                  <div className="al-menu-wrapper">
                    <button
                      className="al-btn-icon"
                      onClick={() =>
                        setActionMenuId(actionMenuId === appt.id ? null : appt.id)
                      }
                    >
                      <MoreVertical size={16} />
                    </button>

                    {actionMenuId === appt.id && (
                      <div className="al-menu">
                        <button
                          onClick={() => {
                            setActionMenuId(null);
                            navigate(`/appointments/${appt.id}`);
                          }}
                        >
                          View Details
                        </button>

                        {canJoin && isCallType && (
                          <button
                            onClick={() => {
                              setActionMenuId(null);
                              navigate(`/video-call/${appt.id}`);
                            }}
                          >
                            {isAudio ? <Phone size={14} /> : <Video size={14} />}
                            {isAudio ? 'Join Call' : 'Join Video'}
                          </button>
                        )}

                        {canReview && (
                          <button
                            onClick={() => {
                              setActionMenuId(null);
                              setReviewingAppointment(appt);
                            }}
                          >
                            <Star size={14} /> Leave Review
                          </button>
                        )}

                        {['pending', 'confirmed', 'in_progress'].includes(
                          appt.status?.toLowerCase()
                        ) && (
                          <button
                            className="danger"
                            onClick={() => performAction(appt.id, 'cancel')}
                          >
                            <XCircle size={14} /> Cancel
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

      {/* Review modal */}
      {reviewingAppointment && (
        <ReviewForm
          appointment={reviewingAppointment}
          doctor={reviewingAppointment.doctor}
          onClose={() => setReviewingAppointment(null)}
          onSubmitted={() => {
            setReviewingAppointment(null);
            fetchAppointments();
          }}
        />
      )}
    </div>
  );
};

export default AppointmentList;