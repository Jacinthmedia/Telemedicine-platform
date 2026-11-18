
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  Calendar,
  Users,
  Clock,
  FileText,
  CheckCircle,
  ChevronRight,
  MessageSquare,
  Loader,
  AlertCircle,
  Star,
  Video,
  Check,
  Activity,
  ArrowRight,
  Pill,
  Stethoscope,
  MoreHorizontal,
  X,
  TrendingUp
} from 'lucide-react';
import { toast } from 'react-toastify';
import './DoctorDashboard.css';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get('/doctors/dashboard/');
      setData(res.data?.data || res.data);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to load dashboard.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleAction = async (action, appointmentId) => {
    setActionLoading(appointmentId);

    try {
      if (action === 'confirm') {
        await api.post(`/appointments/${appointmentId}/confirm/`);
        toast.success('Appointment confirmed!');
      } else if (action === 'complete') {
        await api.post(`/appointments/${appointmentId}/complete/`);
        toast.success('Appointment completed!');
      } else if (action === 'start') {
        navigate(`/video-call/${appointmentId}`);
        return;
      }

      await fetchDashboard();
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Action failed.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="doctor-dashboard-loading">
        <Loader className="doctor-spin" size={30} />
        <span>Loading your dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="doctor-dashboard-error">
        <AlertCircle size={22} />
        <span>{error}</span>
        <button onClick={fetchDashboard}>Try Again</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="doctor-dashboard-error">
        No dashboard data available.
      </div>
    );
  }

  const stats = data.statistics || {};
  const recentAppointments = data.recent_appointments || [];

  const doctorName =
    user?.full_name ||
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    user?.username ||
    'Doctor';

  const firstName =
    user?.first_name || doctorName.split(' ')[0];

  const getInitial = (name) => name?.charAt(0)?.toUpperCase() || 'P';

  const getStatusLabel = (status) => {
    return (status || 'pending').replace('_', ' ');
  };

  return (
    <div className="doctor-dashboard">

      {/* DASHBOARD WELCOME */}
      <section className="doctor-welcome">
        <div className="doctor-welcome-content">
          <span className="doctor-welcome-label">
            YOUR MEDICAL WORKSPACE
          </span>

          <h1>
            {getGreeting()}, Dr. {firstName}!
          </h1>

          <p>
            Here's an overview of your consultations and patient activities.
          </p>

          <Link to="/appointments" className="doctor-welcome-button">
            View Appointments <ArrowRight size={16} />
          </Link>
        </div>

        <div className="doctor-welcome-decoration">
          <Stethoscope size={105} />
        </div>
      </section>

      {/* MAIN DASHBOARD GRID */}
      <div className="doctor-dashboard-grid">

        {/* MAIN CONTENT */}
        <div className="doctor-dashboard-main">

          {/* STATISTICS */}
          <section className="doctor-stats-grid">

            <Link to="/appointments" className="doctor-stat-card">
              <div className="doctor-stat-top">
                <div className="doctor-stat-icon purple">
                  <Calendar size={20} />
                </div>
                <span className="doctor-stat-indicator">
                  <TrendingUp size={14} />
                </span>
              </div>

              <span className="doctor-stat-label">
                Today's Appointments
              </span>

              <strong>{stats.today_appointments || 0}</strong>
            </Link>

            <Link to="/appointments" className="doctor-stat-card">
              <div className="doctor-stat-top">
                <div className="doctor-stat-icon orange">
                  <Clock size={20} />
                </div>
              </div>

              <span className="doctor-stat-label">
                Pending Appointments
              </span>

              <strong>{stats.pending_appointments || 0}</strong>
            </Link>

            <Link to="/chat" className="doctor-stat-card">
              <div className="doctor-stat-top">
                <div className="doctor-stat-icon green">
                  <MessageSquare size={20} />
                </div>
              </div>

              <span className="doctor-stat-label">
                Unread Messages
              </span>

              <strong>{stats.unread_messages || 0}</strong>
            </Link>

            <Link to="/medical-records" className="doctor-stat-card">
              <div className="doctor-stat-top">
                <div className="doctor-stat-icon blue">
                  <Users size={20} />
                </div>
              </div>

              <span className="doctor-stat-label">
                Total Patients
              </span>

              <strong>{stats.total_patients || 0}</strong>
            </Link>

          </section>

          {/* QUICK ACTIONS */}
          <section className="doctor-quick-section">
            <div className="doctor-section-heading">
              <div>
                <h2>Quick Actions</h2>
                <p>Access your frequently used tools</p>
              </div>
              <MoreHorizontal size={21} />
            </div>

            <div className="doctor-quick-grid">

              <Link to="/prescriptions" className="doctor-quick-card">
                <div className="doctor-quick-icon purple">
                  <FileText size={21} />
                </div>
                <span>New Prescription</span>
                <ArrowRight size={16} />
              </Link>

              <Link to="/doctor/availability" className="doctor-quick-card">
                <div className="doctor-quick-icon orange">
                  <Clock size={21} />
                </div>
                <span>Manage Availability</span>
                <ArrowRight size={16} />
              </Link>

              <Link to="/medical-records" className="doctor-quick-card">
                <div className="doctor-quick-icon green">
                  <Users size={21} />
                </div>
                <span>Patient Records</span>
                <ArrowRight size={16} />
              </Link>

              <Link to="/chat" className="doctor-quick-card">
                <div className="doctor-quick-icon blue">
                  <MessageSquare size={21} />
                </div>
                <span>Messages</span>
                <ArrowRight size={16} />
              </Link>

            </div>
          </section>

          {/* RECENT APPOINTMENTS */}
          <section className="doctor-appointments-section">

            <div className="doctor-section-heading">
              <div>
                <h2>Recent Appointments</h2>
                <p>Keep track of your patient consultations</p>
              </div>

              <Link to="/appointments" className="doctor-see-all">
                See All <ArrowRight size={15} />
              </Link>
            </div>

            <div className="doctor-appointments-list">

              {recentAppointments.length === 0 ? (
                <div className="doctor-empty-state">
                  <Calendar size={30} />
                  <h3>No recent appointments</h3>
                  <p>Your upcoming appointments will appear here.</p>
                </div>
              ) : (
                recentAppointments.slice(0, 5).map((appt) => (

                  <div className="doctor-appointment-card" key={appt.id}>

                    <div className="doctor-patient-avatar">
                      {getInitial(appt.patient_name)}
                    </div>

                    <div className="doctor-appointment-details">
                      <strong>
                        {appt.patient_name || 'Patient'}
                      </strong>

                      <span>
                        <Calendar size={13} />
                        {appt.appointment_date || 'Date unavailable'}
                      </span>

                      <span>
                        <Clock size={13} />
                        {appt.start_time?.slice(0, 5) || 'Time unavailable'}
                        {' · '}
                        {appt.consultation_type || 'Consultation'}
                      </span>
                    </div>

                    <div className="doctor-appointment-actions">

                      <span className={`doctor-status-badge ${appt.status}`}>
                        {getStatusLabel(appt.status)}
                      </span>

                      <div className="doctor-action-buttons">

                        {appt.status === 'pending' && (
                          <button
                            className="doctor-action-btn confirm"
                            onClick={() => handleAction('confirm', appt.id)}
                            disabled={actionLoading === appt.id}
                          >
                            {actionLoading === appt.id
                              ? <Loader size={14} className="doctor-spin" />
                              : <><Check size={14} /> Confirm</>}
                          </button>
                        )}

                        {appt.status === 'confirmed' && (
                          <button
                            className="doctor-action-btn start"
                            onClick={() => handleAction('start', appt.id)}
                          >
                            <Video size={14} /> Start Call
                          </button>
                        )}

                        {appt.status === 'in_progress' && (
                          <button
                            className="doctor-action-btn complete"
                            onClick={() => handleAction('complete', appt.id)}
                            disabled={actionLoading === appt.id}
                          >
                            {actionLoading === appt.id
                              ? <Loader size={14} className="doctor-spin" />
                              : <><CheckCircle size={14} /> Complete</>}
                          </button>
                        )}

                      </div>
                    </div>

                  </div>
                ))
              )}

            </div>
          </section>

          {/* PROFILE INSIGHTS */}
          <section className="doctor-profile-insights">
            <div className="doctor-section-heading">
              <div>
                <h2>Profile Insights</h2>
                <p>Your professional profile overview</p>
              </div>
            </div>

            <div className="doctor-insights-grid">

              <div className="doctor-insight-card">
                <div className="doctor-insight-icon green">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <span>Verification Status</span>
                  <strong>Verified</strong>
                </div>
              </div>

              <div className="doctor-insight-card">
                <div className="doctor-insight-icon orange">
                  <Star size={20} />
                </div>
                <div>
                  <span>Doctor Rating</span>
                  <strong>{stats.rating || '0.0'} / 5.0</strong>
                </div>
              </div>

            </div>
          </section>

        </div>

        {/* RIGHT SIDEBAR PANEL */}
        <aside className="doctor-dashboard-aside">

          <section className="doctor-profile-card">

            <div className="doctor-profile-card-heading">
              <span>Doctor Profile</span>
              <Link to="/doctor/profile">
                <ArrowRight size={17} />
              </Link>
            </div>

            <div className="doctor-profile-avatar">
              {getInitial(firstName)}
            </div>

            <h2>Dr. {doctorName}</h2>
            <span className="doctor-profile-role">
              Medical Professional
            </span>

            <div className="doctor-profile-divider" />

            <div className="doctor-profile-detail">
              <span>Appointments Today</span>
              <strong>{stats.today_appointments || 0}</strong>
            </div>

            <div className="doctor-profile-detail">
              <span>Total Patients</span>
              <strong>{stats.total_patients || 0}</strong>
            </div>

            <div className="doctor-profile-detail">
              <span>Rating</span>
              <strong>
                <Star size={14} fill="currentColor" />
                {stats.rating || '0.0'}
              </strong>
            </div>

            <Link to="/doctor/profile" className="doctor-profile-button">
              View Profile <ArrowRight size={16} />
            </Link>

          </section>

          {/* APPOINTMENT QUEUE */}
          <section className="doctor-queue-card">
            <div className="doctor-section-heading">
              <div>
                <h2>Appointment Queue</h2>
                <p>Your latest patient appointments</p>
              </div>
            </div>

            {recentAppointments.length === 0 ? (
              <div className="doctor-queue-empty">
                No patients in your recent queue.
              </div>
            ) : (
              recentAppointments.slice(0, 3).map((appt) => (
                <div className="doctor-queue-item" key={appt.id}>
                  <div className="doctor-queue-avatar">
                    {getInitial(appt.patient_name)}
                  </div>

                  <div className="doctor-queue-info">
                    <strong>{appt.patient_name || 'Patient'}</strong>
                    <span>
                      {appt.appointment_date || 'Date unavailable'}
                    </span>
                  </div>

                  <span className={`doctor-queue-status ${appt.status}`}>
                    {getStatusLabel(appt.status)}
                  </span>
                </div>
              ))
            )}

            <Link to="/appointments" className="doctor-queue-link">
              View All Appointments <ArrowRight size={15} />
            </Link>
          </section>

          {/* SHORTCUT */}
          <section className="doctor-help-card">
            <div className="doctor-help-icon">
              <Pill size={22} />
            </div>

            <h3>Prescriptions</h3>
            <p>Create and manage patient prescriptions from one place.</p>

            <Link to="/prescriptions">
              Open Prescriptions <ArrowRight size={15} />
            </Link>
          </section>

        </aside>

      </div>
    </div>
  );
};

export default DoctorDashboard;
