import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Heart,
  Thermometer,
  Droplet,
  Pill,
  Users,
  Shield,
  ChevronRight,
  ExternalLink,
  Edit,
  Send,
  Info
} from 'lucide-react';


import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axios';
import {
  Loader,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  DollarSign,
  Stethoscope,
  Clock,
  FileText,
  Calendar,
  Phone,
  Video,
  MessageSquare,
  PlayCircle,
  Ban
} from 'lucide-react';

import './AppointmentDetails.css';
import MedicalRecordForm from '../medical/MedicalRecordForm';

const AppointmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || 'patient';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [appointment, setAppointment] = useState(null);
  const [medicalRecord, setMedicalRecord] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // ============================================
  // FETCH
  // ============================================
  useEffect(() => {
    fetchAppointment();
    // eslint-disable-next-line
  }, [id]);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await api.get(`/appointments/${id}/`);
      const data = res.data.data || res.data;
      setAppointment(data);

      // Try to fetch related medical record + prescriptions
      try {
        const mrRes = await api.get('/medical-records/', {
          params: { appointment: id },
        });
        const mrs = mrRes.data.results || mrRes.data.data || mrRes.data || [];
        if (Array.isArray(mrs) && mrs.length > 0) {
          setMedicalRecord(mrs[0]);
        }
      } catch (e) {
        // silent
      }

      try {
        const pxRes = await api.get('/prescriptions/', {
          params: { appointment: id },
        });
        const pxs = pxRes.data.results || pxRes.data.data || pxRes.data || [];
        setPrescriptions(Array.isArray(pxs) ? pxs : []);
      } catch (e) {
        // silent
      }
    } catch (err) {
      console.error('Error loading appointment:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to load appointment'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ACTIONS
  // ============================================
  const performAction = async (action) => {
    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      await api.post(`/appointments/${id}/${action}/`);

      const newStatus = {
        confirm: 'confirmed',
        start: 'in_progress',
        complete: 'completed',
        cancel: 'cancelled',
      }[action];

      if (newStatus) {
        setAppointment((prev) => ({ ...prev, status: newStatus }));
      }

      setSuccess(`Appointment ${action}ed successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        `Failed to ${action} appointment`
      );
    } finally {
      setProcessing(false);
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (t) => (t ? t.slice(0, 5) : '');
  const formatDateTime = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount, currency = 'NGN') => {
    const symbols = { NGN: '₦', USD: '$', EUR: '€', GBP: '£' };
    const symbol = symbols[currency] || currency + ' ';
    return `${symbol}${parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

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

  const getBpDisplay = (r) => {
    if (!r?.blood_pressure_systolic || !r?.blood_pressure_diastolic) return null;
    return `${r.blood_pressure_systolic}/${r.blood_pressure_diastolic}`;
  };

  // ============================================
  // LOADING / ERROR
  // ============================================
  if (loading) {
    return (
      <div className="ad-loading">
        <Loader size={32} className="spin" />
        <p>Loading appointment...</p>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="ad-error">
        <AlertCircle size={48} />
        <h2>Could not load appointment</h2>
        <p>{error}</p>
        <button className="ad-btn-primary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  const statusCfg = getStatusConfig(appointment.status);
  const isPatient = role === 'patient';
  const isDoctor = role === 'doctor';
  const isAdmin = role === 'admin';
  const otherUser = isDoctor
    ? appointment.patient?.user
    : appointment.doctor?.user;
  const otherRole = isDoctor ? 'Patient' : 'Doctor';
  const isAudio = appointment.consultation_type === 'audio';
  const isVideo = appointment.consultation_type === 'video';
  const isChat = appointment.consultation_type === 'chat';
  const isCallType = isAudio || isVideo;
  const canJoin = ['confirmed', 'in_progress'].includes(appointment.status);
  const canCancel = ['pending', 'confirmed', 'in_progress'].includes(appointment.status);

  

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="ad-page">
      {/* Back button */}
      <button className="ad-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>

      {/* Error / success banners */}
      {error && (
        <div className="ad-banner error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
      {success && (
        <div className="ad-banner success">
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {isPatient && !appointment.is_paid && ['pending', 'confirmed'].includes(appointment.status) && (
  <button
    className="ad-action primary"
    onClick={() => navigate(`/payments/appointment/${appointment.id}`)}
  >
    <DollarSign size={16} /> Pay {formatCurrency(appointment.doctor?.consultation_fee)}
  </button>
)}

      {/* ============ HERO ============ */}
      <div className="ad-hero">
        <div className="ad-hero-left">
          <div className="ad-hero-avatar">
            {getInitials(otherUser)}
          </div>
          <div className="ad-hero-info">
            <span className="ad-hero-role">{otherRole}</span>
            <h1>
              {isDoctor
                ? `${otherUser?.first_name} ${otherUser?.last_name}`
                : `Dr. ${otherUser?.first_name} ${otherUser?.last_name}`}
            </h1>
            {!isDoctor && appointment.doctor?.specialization && (
              <p className="ad-hero-spec">
                <Stethoscope size={14} /> {appointment.doctor.specialization}
              </p>
            )}
            <p className="ad-hero-id">
              Appointment #{appointment.appointment_id?.slice(0, 8) || appointment.id}
            </p>
          </div>
        </div>

        <div className="ad-hero-right">
          <span
            className="ad-status-pill"
            style={{ background: statusCfg.bg, color: statusCfg.color }}
          >
            {statusCfg.label}
          </span>
          {appointment.is_paid ? (
            <span className="ad-payment-pill paid">
              <CheckCircle size={13} /> Paid
            </span>
          ) : (
            <span className="ad-payment-pill unpaid">
              <Clock size={13} /> Unpaid
            </span>
          )}
        </div>
      </div>

      {/* ============ TABS ============ */}
      <div className="ad-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: FileText },
          { id: 'clinical', label: 'Clinical Notes', icon: Activity },
          { id: 'prescriptions', label: `Prescriptions (${prescriptions.length})`, icon: Pill },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`ad-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ============ OVERVIEW TAB ============ */}
      {activeTab === 'overview' && (
        <div className="ad-content">
          {/* When & how */}
          <section className="ad-card">
            <h3><Calendar size={18} /> When & How</h3>
            <div className="ad-info-grid">
              <InfoRow icon={Calendar} label="Date" value={formatDate(appointment.appointment_date)} />
              <InfoRow icon={Clock} label="Time" value={`${formatTime(appointment.start_time)} — ${formatTime(appointment.end_time)}`} />
              <InfoRow icon={Clock} label="Duration" value={`${appointment.duration || 30} minutes`} />
              <InfoRow
                icon={isAudio ? Phone : isVideo ? Video : MessageSquare}
                label="Consultation"
                value={appointment.consultation_type_display || appointment.consultation_type}
              />
            </div>
          </section>

          {/* Reason */}
          {(appointment.reason || appointment.symptoms) && (
            <section className="ad-card">
              <h3><FileText size={18} /> Reason for Visit</h3>
              {appointment.reason && (
                <div className="ad-reason">
                  <span>Reason</span>
                  <p>{appointment.reason}</p>
                </div>
              )}
              {appointment.symptoms && (
                <div className="ad-reason">
                  <span>Symptoms</span>
                  <p>{appointment.symptoms}</p>
                </div>
              )}
            </section>
          )}

          {/* Payment */}
          <section className="ad-card">
            <h3><DollarSign size={18} /> Payment</h3>
            <div className="ad-info-grid">
              <InfoRow
                icon={DollarSign}
                label="Fee"
                value={formatCurrency(appointment.doctor?.consultation_fee)}
              />
              <InfoRow
                icon={CheckCircle}
                label="Status"
                value={appointment.payment_status_display || appointment.payment_status}
              />
              {appointment.payment_id && (
                <InfoRow
                  icon={Shield}
                  label="Transaction"
                  value={appointment.payment_id.slice(0, 16) + '...'}
                />
              )}
              {appointment.is_paid && (
                <InfoRow
                  icon={Calendar}
                  label="Paid At"
                  value={formatDateTime(appointment.payment_paid_at)}
                />
              )}
            </div>
          </section>

          {/* Timeline */}
          <section className="ad-card">
            <h3><Activity size={18} /> Timeline</h3>
            <div className="ad-timeline">
              <TimelineItem
                label="Created"
                value={formatDateTime(appointment.created_at)}
                active
              />
              {appointment.call_started_at && (
                <TimelineItem
                  label="Call Started"
                  value={formatDateTime(appointment.call_started_at)}
                  active
                />
              )}
              {appointment.completed_at && (
                <TimelineItem
                  label="Completed"
                  value={formatDateTime(appointment.completed_at)}
                  active
                  success
                />
              )}
            </div>
          </section>
        </div>
      )}

      {/* ============ CLINICAL TAB ============ */}
      {activeTab === 'clinical' && (
        <div className="ad-content">
          {!medicalRecord ? (
            <div className="ad-empty-section">
              <FileText size={40} />
              <h3>No clinical notes yet</h3>
              <p>
                {appointment.status === 'completed'
                  ? 'The medical record has not been created yet.'
                  : 'Clinical notes will appear here after the appointment is completed.'}
              </p>
            </div>
          ) : (
            <>
              {medicalRecord.diagnosis && (
                <section className="ad-card">
                  <h3><FileText size={18} /> Diagnosis</h3>
                  <p className="ad-notes">{medicalRecord.diagnosis}</p>
                </section>
              )}

              {medicalRecord.treatment && (
                <section className="ad-card">
                  <h3><Stethoscope size={18} /> Treatment Plan</h3>
                  <p className="ad-notes">{medicalRecord.treatment}</p>
                </section>
              )}

              {getBpDisplay(medicalRecord) && (
                <section className="ad-card">
                  <h3><Heart size={18} /> Vitals</h3>
                  <div className="ad-vitals-grid">
                    {getBpDisplay(medicalRecord) && (
                      <VitalBox icon={Activity} label="Blood Pressure" value={`${getBpDisplay(medicalRecord)} mmHg`} />
                    )}
                    {medicalRecord.vitals?.heart_rate && (
                      <VitalBox icon={Heart} label="Heart Rate" value={`${medicalRecord.vitals.heart_rate} bpm`} />
                    )}
                    {medicalRecord.vitals?.temperature && (
                      <VitalBox icon={Thermometer} label="Temperature" value={`${medicalRecord.vitals.temperature}°C`} />
                    )}
                    {medicalRecord.vitals?.weight && (
                      <VitalBox icon={Droplet} label="Weight" value={`${medicalRecord.vitals.weight} kg`} />
                    )}
                  </div>
                </section>
              )}

              {medicalRecord.notes && (
                <section className="ad-card">
                  <h3><FileText size={18} /> Doctor's Notes</h3>
                  <p className="ad-notes italic">{medicalRecord.notes}</p>
                </section>
              )}

              {medicalRecord.follow_up_date && (
                <div className="ad-followup">
                  <Calendar size={18} />
                  <div>
                    <strong>Follow-up Scheduled</strong>
                    <p>{formatDate(medicalRecord.follow_up_date)}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ============ PRESCRIPTIONS TAB ============ */}
      {activeTab === 'prescriptions' && (
        <div className="ad-content">
          {prescriptions.length === 0 ? (
            <div className="ad-empty-section">
              <Pill size={40} />
              <h3>No prescriptions</h3>
              <p>Prescriptions issued during this appointment will appear here.</p>
            </div>
          ) : (
            <div className="ad-prescription-list">
              {prescriptions.map((p) => (
                <div key={p.id} className="ad-prescription-card">
                  <div className="ad-prescription-icon">
                    <Pill size={20} />
                  </div>
                  <div className="ad-prescription-body">
                    <h4>{p.medication_name}</h4>
                    <p><strong>Dosage:</strong> {p.dosage}</p>
                    <p><strong>Frequency:</strong> {p.frequency}</p>
                    <p><strong>Duration:</strong> {p.duration}</p>
                    {p.instructions && (
                      <p className="ad-prescription-note">
                        <Info size={12} /> {p.instructions}
                      </p>
                    )}
                    <div className="ad-prescription-meta">
                      <span className={`ad-px-status ${p.is_active ? 'active' : 'inactive'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="ad-px-refills">
                        {p.refills_remaining ?? (p.refills - p.refills_used)} refills left
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ ACTION BAR ============ */}
      <div className="ad-actions">
        {/* Join call (video/audio) */}
        {canJoin && isCallType && (
          <button
            className="ad-action primary"
            onClick={() => navigate(`/video-call/${appointment.id}`)}
            disabled={processing}
          >
            {isAudio ? <Phone size={16} /> : <Video size={16} />}
            Join {isAudio ? 'Voice' : 'Video'} Call
          </button>
        )}

        {/* Open chat */}
        {isChat && canJoin && (
          <button
            className="ad-action primary"
            onClick={() => navigate(`/chat/${otherUser?.id}`)}
            disabled={processing}
          >
            <MessageSquare size={16} /> Open Chat
          </button>
        )}

        {/* Doctor: confirm */}
        {isDoctor && appointment.status === 'pending' && (
          <button
            className="ad-action success"
            onClick={() => performAction('confirm')}
            disabled={processing}
          >
            <CheckCircle size={16} /> Confirm Appointment
          </button>
        )}

        {/* Doctor: start */}
        {isDoctor && appointment.status === 'confirmed' && (
          <button
            className="ad-action primary"
            onClick={() => performAction('start')}
            disabled={processing}
          >
            <PlayCircle size={16} /> Start Appointment
          </button>
        )}

        {/* Doctor: complete */}
        {isDoctor && appointment.status === 'in_progress' && (
          <button
            className="ad-action success"
            onClick={() => performAction('complete')}
            disabled={processing}
          >
            <CheckCircle size={16} /> Mark Complete
          </button>
        )}

        {/* Doctor: write medical record */}
        {isDoctor && ['in_progress', 'completed'].includes(appointment.status) && (
          <button
            className="ad-action primary"
            onClick={() => setShowRecordForm(true)}
            disabled={processing}
          >
            <FileText size={16} /> Write Medical Record
          </button>
        )}

        {/* Cancel */}
        {canCancel && (
          <button
            className="ad-action danger"
            onClick={() => {
              if (window.confirm('Cancel this appointment?')) {
                performAction('cancel');
              }
            }}
            disabled={processing}
          >
            <Ban size={16} /> Cancel
          </button>
        )}

        {/* Back to list */}
        <button className="ad-action secondary" onClick={() => navigate('/appointments')}>
          <ChevronRight size={16} /> All Appointments
        </button>
      </div>
    
      {/* ============ MEDICAL RECORD MODAL ============ */}
      {showRecordForm && (
        <MedicalRecordForm
          appointment={{
            id: appointment.id,
            patient: appointment.patient,
            patient_name: appointment.patient_name,
            appointment_date: appointment.appointment_date,
          }}
          onClose={() => setShowRecordForm(false)}
          onSaved={() => {
            setShowRecordForm(false);
            fetchAppointment();
          }}
        />
      )}
</div>
  );
};

// ============================================
// Small components
// ============================================

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="ad-info-row">
    <div className="ad-info-icon">
      <Icon size={14} />
    </div>
    <div>
      <span>{label}</span>
      <strong>{value || 'N/A'}</strong>
    </div>
  </div>
);

const TimelineItem = ({ label, value, active, success }) => (
  <div className={`ad-timeline-item ${active ? 'active' : ''} ${success ? 'success' : ''}`}>
    <div className="ad-timeline-dot" />
    <div>
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  </div>
);

const VitalBox = ({ icon: Icon, label, value }) => (
  <div className="ad-vital-box">
    <Icon size={16} />
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export default AppointmentDetails;
