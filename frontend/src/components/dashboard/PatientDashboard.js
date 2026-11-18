import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import './PatientDashboard.css';

import {
  Calendar,
  Clock,
  CheckCircle,
  Activity,
  FileText,
  Pill,
  Video,
  Search,
  Plus,
  Stethoscope,
  User,
  Heart,
  Brain,
  Bone,
  Shield,
  Baby,
  Scissors,
  MoreHorizontal,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MessageCircle,
  FlaskConical,
  Hospital,
  Sparkles,
  CalendarDays,
  MapPin,
  Bell,
} from 'lucide-react';

const specialties = [
  { name: 'General', icon: Plus },
  { name: 'Pediatrics', icon: Baby },
  { name: 'Obstetrics & Gynecology', icon: Heart },
  { name: 'Internal Medicine', icon: Activity },
  { name: 'Dermatology', icon: Scissors },
  { name: 'Mental Health', icon: Brain },
  { name: 'Cardiology', icon: Heart },
  { name: 'Orthopedics', icon: Bone },
  { name: 'Infectious Disease', icon: Shield },
];

const healthTips = [
  {
    title: 'Stay Hydrated',
    description: 'Drink enough water throughout the day to support your wellbeing.',
    icon: '💧',
  },
  {
    title: 'Move Every Hour',
    description: 'Take short breaks and move around to stay active.',
    icon: '🚶',
  },
  {
    title: 'Eat More Greens',
    description: 'Include vegetables and fruits in your daily meals.',
    icon: '🥬',
  },
];

const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [stats, setStats] = useState({
    upcomingAppointments: 0,
    completedAppointments: 0,
    totalMedicalRecords: 0,
    activePrescriptions: 0,
  });
  const [nextAppointment, setNextAppointment] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [appointments, activeFilter, searchQuery]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [appointmentsRes, dashboardRes] = await Promise.all([
        api.get('/appointments/'),
        api.get('/patients/dashboard/').catch(() => null),
      ]);

      const responseData = appointmentsRes.data?.data
        || appointmentsRes.data?.results
        || appointmentsRes.data
        || [];

      const appointmentsData = Array.isArray(responseData)
        ? responseData
        : [];

      setAppointments(appointmentsData);

      const dashboardData = dashboardRes?.data?.data
        || dashboardRes?.data
        || {};

      const statistics = dashboardData.statistics
        || dashboardData.stats
        || dashboardData;

      const computedUpcoming = appointmentsData.filter((apt) =>
        ['pending', 'confirmed'].includes(apt.status?.toLowerCase())
      ).length;

      const computedCompleted = appointmentsData.filter(
        (apt) => apt.status?.toLowerCase() === 'completed'
      ).length;

      setStats({
        upcomingAppointments:
          statistics.upcoming_appointments
          ?? statistics.upcomingAppointments
          ?? computedUpcoming,

        completedAppointments:
          statistics.completed_appointments
          ?? statistics.completedAppointments
          ?? computedCompleted,

        totalMedicalRecords:
          statistics.total_medical_records
          ?? statistics.totalMedicalRecords
          ?? 0,

        activePrescriptions:
          statistics.active_prescriptions
          ?? statistics.activePrescriptions
          ?? 0,
      });

      const upcoming = appointmentsData
        .filter((apt) =>
          ['pending', 'confirmed'].includes(apt.status?.toLowerCase())
        )
        .sort((a, b) => {
          const dateA = new Date(
            `${a.appointment_date || ''}T${a.start_time || '00:00'}`
          );
          const dateB = new Date(
            `${b.appointment_date || ''}T${b.start_time || '00:00'}`
          );
          return dateA - dateB;
        });

      setNextAppointment(upcoming[0] || null);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAppointments = () => {
    let filtered = [...appointments];

    if (activeFilter !== 'all') {
      if (activeFilter === 'upcoming') {
        filtered = filtered.filter((apt) =>
          ['pending', 'confirmed'].includes(apt.status?.toLowerCase())
        );
      } else {
        filtered = filtered.filter(
          (apt) => apt.status?.toLowerCase() === activeFilter
        );
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      filtered = filtered.filter((apt) =>
        getDoctorName(apt).toLowerCase().includes(query)
        || apt.reason?.toLowerCase().includes(query)
        || getDoctorSpecialty(apt).toLowerCase().includes(query)
      );
    }

    setFilteredAppointments(filtered);
  };

  const getDoctorName = (appointment) => {
    const doctor = appointment?.doctor;

    if (!doctor) {
      return appointment?.doctor_name || 'Doctor not assigned';
    }

    if (doctor.user?.first_name || doctor.user?.last_name) {
      return `${doctor.user.first_name || ''} ${doctor.user.last_name || ''}`.trim();
    }

    if (doctor.first_name || doctor.last_name) {
      return `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim();
    }

    return doctor.name || doctor.full_name || appointment.doctor_name || 'Doctor';
  };

  const getDoctorSpecialty = (appointment) =>
    appointment?.doctor?.specialization
    || appointment?.doctor?.specialty
    || appointment?.doctor_specialty
    || 'General Practice';

  const getStatusColor = (status) => {
    const colors = {
      pending: '#d99a25',
      confirmed: '#2386d1',
      in_progress: '#8b5cf6',
      completed: '#159b79',
      cancelled: '#e45b68',
    };

    return colors[status?.toLowerCase()] || '#8290a3';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date unavailable';

    const date = new Date(dateString);

    if (isNaN(date)) return 'Date unavailable';

    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Time unavailable';

    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);

    if (isNaN(hour)) return timeString;

    return `${hour % 12 || 12}:${minutes || '00'} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';

    return 'Good Evening';
  };

  const displayedSpecialties = useMemo(() => {
    return specialties.filter((specialty) =>
      specialty.name.toLowerCase().includes(doctorSearch.toLowerCase())
    );
  }, [doctorSearch]);

  const handleSpecialtyClick = (specialty) => {
    navigate('/patient/doctors', {
      state: { specialty: specialty === 'General' ? '' : specialty },
    });
  };

  const handleDoctorSearch = (event) => {
    event.preventDefault();

    navigate('/patient/doctors', {
      state: { search: doctorSearch },
    });
  };

  const appointmentQueue = nextAppointment;

  return (
    <div className="dashboard-container">

      {/* MAIN WELCOME AREA */}
      <main className="patient-main">

        <div className="patient-topbar">
          <div>
            <span className="patient-eyebrow">
              <Sparkles size={14} />
              YOUR PERSONAL HEALTH SPACE
            </span>

            <h1>
              {getGreeting()},{' '}
              {user?.first_name || user?.username || 'Patient'}
            </h1>

            <p>Here is an overview of your healthcare journey.</p>
          </div>

          <button
            className="patient-notification"
            type="button"
            aria-label="Notifications"
            onClick={() => navigate('/notifications')}
          >
            <Bell size={20} />
            <span />
          </button>
        </div>

        {/* APPOINTMENT HERO */}
        <section className="patient-hero">
          <div className="hero-copy">
            <span className="hero-overline">
              <CalendarDays size={15} />
              YOUR APPOINTMENT
            </span>

            {nextAppointment ? (
              <>
                <h2>Dr. {getDoctorName(nextAppointment)}</h2>

                <p>{getDoctorSpecialty(nextAppointment)}</p>

                <div className="hero-appointment-meta">
                  <span>
                    <Calendar size={15} />
                    {formatDate(nextAppointment.appointment_date)}
                  </span>

                  <span>
                    <Clock size={15} />
                    {formatTime(nextAppointment.start_time)}
                  </span>
                </div>

                <button
                  className="hero-details-button"
                  onClick={() =>
                    navigate(`/appointments/${nextAppointment.id}`)
                  }
                >
                  View appointment
                  <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <>
                <h2>Your health matters.</h2>
                <p>You do not have an upcoming appointment.</p>

                <button
                  className="hero-details-button"
                  onClick={() => navigate('/appointments/book')}
                >
                  Book an appointment
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>

          <div className="hero-decoration">
            <div className="hero-orbit hero-orbit-one" />
            <div className="hero-orbit hero-orbit-two" />
            <div className="hero-medical-icon">
              <Stethoscope size={100} strokeWidth={1.1} />
            </div>
            <div className="hero-floating-plus">+</div>
            <div className="hero-floating-heart">
              <Heart size={24} />
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="patient-shortcuts">
          {[
            {
              label: 'Pharmacy',
              icon: Pill,
              action: () => navigate('/prescriptions'),
            },
            {
              label: 'My Queue',
              icon: ClipboardList,
              action: () => navigate('/appointments'),
            },
            {
              label: 'Book',
              icon: TicketIcon,
              action: () => navigate('/appointments/book'),
            },
            {
              label: 'Doctors',
              icon: Stethoscope,
              action: () => navigate('/patient/doctors'),
            },
            {
              label: 'Schedule',
              icon: CalendarDays,
              action: () => navigate('/appointments'),
            },
            {
              label: 'More',
              icon: MoreHorizontal,
              action: () => navigate('/patient/profile'),
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <button
                className="patient-shortcut"
                key={item.label}
                onClick={item.action}
              >
                <span className="shortcut-circle">
                  <Icon size={23} strokeWidth={1.8} />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </section>

        {/* HEALTH TIPS AND RESULTS */}
        <section className="patient-information-grid">

          <div className="patient-info-panel">
            <div className="patient-panel-heading">
              <div>
                <span className="panel-kicker">WELLNESS</span>
                <h3>Health Tips</h3>
              </div>

              <span className="panel-heading-icon">
                <Heart size={18} />
              </span>
            </div>

            <div className="health-tip-list">
              {healthTips.map((tip) => (
                <div className="health-tip" key={tip.title}>
                  <div className="health-tip-image">
                    {tip.icon}
                  </div>

                  <div>
                    <h4>{tip.title}</h4>
                    <p>{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="patient-info-panel">
            <div className="patient-panel-heading">
              <div>
                <span className="panel-kicker">YOUR ACTIVITY</span>
                <h3>Results & History</h3>
              </div>

              <button
                className="panel-arrow-button"
                onClick={() => navigate('/medical-records')}
                aria-label="View medical records"
              >
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="history-list">
              <div className="history-row">
                <span className="history-dot" />
                <div>
                  <small>Completed appointments</small>
                  <strong>{stats.completedAppointments}</strong>
                </div>
                <CheckCircle size={17} />
              </div>

              <div className="history-row">
                <span className="history-dot" />
                <div>
                  <small>Medical records</small>
                  <strong>{stats.totalMedicalRecords}</strong>
                </div>
                <FileText size={17} />
              </div>

              <div className="history-row">
                <span className="history-dot" />
                <div>
                  <small>Active prescriptions</small>
                  <strong>{stats.activePrescriptions}</strong>
                </div>
                <Pill size={17} />
              </div>

              <div className="history-row">
                <span className="history-dot" />
                <div>
                  <small>Upcoming appointments</small>
                  <strong>{stats.upcomingAppointments}</strong>
                </div>
                <Calendar size={17} />
              </div>
            </div>

            <button
              className="history-view-button"
              onClick={() => navigate('/medical-records')}
            >
              Explore medical records
              <ArrowRight size={15} />
            </button>
          </div>
        </section>

        {/* APPOINTMENTS */}
        <section className="appointments-section">
          <div className="section-header">
            <div>
              <span className="panel-kicker">YOUR SCHEDULE</span>
              <h2>My Appointments</h2>
            </div>

            <button
              className="btn-secondary"
              onClick={() => navigate('/appointments')}
            >
              View All <ArrowRight size={15} />
            </button>
          </div>

          <div className="filter-bar">
            <div className="filter-tabs">
              {['all', 'upcoming', 'completed', 'cancelled'].map((filter) => (
                <button
                  key={filter}
                  className={`filter-tab ${
                    activeFilter === filter ? 'active' : ''
                  }`}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            <div className="search-bar">
              <Search size={17} />

              <input
                type="text"
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading your appointments...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="empty-state">
              <Calendar size={38} />
              <h3>No appointments found</h3>

              <p>
                {appointments.length === 0
                  ? "You haven't booked any appointments yet."
                  : 'No appointments match your current search.'}
              </p>

              {appointments.length === 0 && (
                <button
                  className="empty-book-button"
                  onClick={() => navigate('/appointments/book')}
                >
                  <Plus size={17} />
                  Book your first appointment
                </button>
              )}
            </div>
          ) : (
            <div className="appointments-list">
              {filteredAppointments.slice(0, 5).map((appointment) => (
                <div
                  key={appointment.id}
                  className="appointment-item"
                  onClick={() =>
                    navigate(`/appointments/${appointment.id}`)
                  }
                >
                  <div className="appointment-time">
                    <strong>
                      {formatTime(appointment.start_time)}
                    </strong>

                    <span>
                      {formatDate(appointment.appointment_date)}
                    </span>
                  </div>

                  <div className="appointment-patient">
                    <div className="patient-avatar doctor-avatar">
                      <Stethoscope size={19} />
                    </div>

                    <div className="patient-info">
                      <h4>Dr. {getDoctorName(appointment)}</h4>
                      <p>
                        {getDoctorSpecialty(appointment)} ·{' '}
                        {appointment.reason || 'Consultation'}
                      </p>
                    </div>
                  </div>

                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: `${getStatusColor(appointment.status)}18`,
                      color: getStatusColor(appointment.status),
                    }}
                  >
                    {appointment.status}
                  </span>

                  <div className="appointment-actions">
                    {appointment.consultation_type === 'video'
                      && appointment.status?.toLowerCase() === 'confirmed'
                      && (
                        <button
                          className="icon-btn video-btn"
                          title="Join video consultation"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/video-call/${appointment.id}`);
                          }}
                        >
                          <Video size={17} />
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="patient-right-panel">

        <section className="doctor-finder">
          <div className="right-panel-heading">
            <span className="panel-kicker">HEALTHCARE SPECIALISTS</span>
            <h2>Find a doctor</h2>
            <p>Find the right specialist for your needs.</p>
          </div>

          <form className="doctor-search" onSubmit={handleDoctorSearch}>
            <input
              type="search"
              placeholder="Search doctors..."
              value={doctorSearch}
              onChange={(event) => setDoctorSearch(event.target.value)}
            />

            <button type="submit" aria-label="Search doctors">
              <Search size={19} />
            </button>
          </form>

          <div className="specialty-grid">
            {displayedSpecialties.map((specialty) => {
              const Icon = specialty.icon;

              return (
                <button
                  className="specialty-card"
                  key={specialty.name}
                  onClick={() => handleSpecialtyClick(specialty.name)}
                >
                  <span>
                    <Icon size={22} strokeWidth={1.7} />
                  </span>

                  <small>{specialty.name}</small>
                </button>
              );
            })}
          </div>

          {displayedSpecialties.length === 0 && (
            <p className="specialty-empty">
              No matching specialty found.
            </p>
          )}
        </section>

        {/* APPOINTMENT QUEUE */}
        <section className="appointment-queue">
          <div className="queue-heading">
            <div>
              <span className="panel-kicker">YOUR SCHEDULE</span>
              <h3>Appointment queue</h3>
            </div>

            <span className="queue-heading-icon">
              <ClipboardList size={19} />
            </span>
          </div>

          {appointmentQueue ? (
            <>
              <button
                className="queue-doctor-card"
                onClick={() =>
                  navigate(`/appointments/${appointmentQueue.id}`)
                }
              >
                <span className="queue-doctor-avatar">
                  <Stethoscope size={21} />
                </span>

                <span className="queue-doctor-info">
                  <small>{getDoctorSpecialty(appointmentQueue)}</small>
                  <strong>Dr. {getDoctorName(appointmentQueue)}</strong>
                </span>

                <ChevronDown size={19} />
              </button>

              <div className="queue-details-grid">
                <div className="queue-detail">
                  <small>Status</small>
                  <strong className="queue-status">
                    {appointmentQueue.status}
                  </strong>
                </div>

                <div className="queue-detail">
                  <small>Date</small>
                  <strong>
                    {formatDate(appointmentQueue.appointment_date)}
                  </strong>
                </div>

                <div className="queue-detail">
                  <small>Time</small>
                  <strong>
                    {formatTime(appointmentQueue.start_time)}
                  </strong>
                </div>
              </div>

              <button
                className="queue-view-button"
                onClick={() =>
                  navigate(`/appointments/${appointmentQueue.id}`)
                }
              >
                View appointment
                <ArrowRight size={15} />
              </button>
            </>
          ) : (
            <div className="queue-empty">
              <CalendarDays size={30} />
              <h4>No active appointment</h4>
              <p>Your next appointment will appear here.</p>

              <button
                onClick={() => navigate('/appointments/book')}
              >
                Book appointment
              </button>
            </div>
          )}
        </section>

        {/* SUPPORT CARD */}
        <section className="patient-support-card">
          <div className="support-icon">
            <MessageCircle size={22} />
          </div>

          <div>
            <h4>Need assistance?</h4>
            <p>We're here to help with your healthcare journey.</p>
          </div>

          <button
            onClick={() => navigate('/support')}
            aria-label="Contact support"
          >
            <ArrowRight size={18} />
          </button>
        </section>

      </aside>
    </div>
  );
};

// Small icon component for the booking shortcut.
const TicketIcon = ({ size = 23, strokeWidth = 1.8 }) => (
  <CalendarDays size={size} strokeWidth={strokeWidth} />
);

export default PatientDashboard;