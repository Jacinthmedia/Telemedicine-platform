import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Calendar,
  Clock,
  Stethoscope,
  Video,
  MessageSquare,
  User,
  DollarSign,
  AlertCircle,
  CheckCircle,
  FileText,
  Star,
  X,
} from 'lucide-react';
import './AppointmentBooking.css';

const AppointmentBooking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedDoctorId = searchParams.get('doctor');
  const { user } = useAuth();

  // ============================================
  // STATE
  // ============================================
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [availability, setAvailability] = useState([]);

  // Form data
  const [formData, setFormData] = useState({
    appointment_date: '',
    start_time: '',
    end_time: '',
    consultation_type: 'video',
    reason: '',
    symptoms: '',
  });

  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);

  // ============================================
  // FETCH DOCTORS
  // ============================================
  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (preselectedDoctorId && doctors.length > 0) {
      const doc = doctors.find((d) => d.id === parseInt(preselectedDoctorId));
      if (doc) {
        setSelectedDoctor(doc);
        setStep(2);
      }
    }
  }, [preselectedDoctorId, doctors]);

  // Load availability when doctor is selected
  useEffect(() => {
    if (selectedDoctor) {
      fetchAvailability(selectedDoctor.id);
    }
  }, [selectedDoctor]);

  // Regenerate slots when date changes
  useEffect(() => {
    if (formData.appointment_date && availability.length > 0) {
      generateSlots(formData.appointment_date);
    }
  }, [formData.appointment_date, availability]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await api.get('/search/doctors/');
      const data = res.data.results || res.data.data || res.data || [];
      setDoctors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError('Failed to load doctors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async (doctorId) => {
    try {
      const res = await api.get(`/doctor-availability/?doctor=${doctorId}`);
      const data = res.data.results || res.data.data || res.data || [];
      setAvailability(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching availability:', err);
      setAvailability([]);
    }
  };

  const fetchBookedSlots = async (doctorId, date) => {
    try {
      const res = await api.get(
        `/appointments/?doctor=${doctorId}&appointment_date=${date}`
      );
      const data = res.data.results || res.data.data || res.data || [];
      const slots = (Array.isArray(data) ? data : [])
        .filter((a) => !['cancelled'].includes(a.status))
        .map((a) => a.start_time?.slice(0, 5));
      setBookedSlots(slots);
    } catch (err) {
      console.error('Error fetching booked slots:', err);
      setBookedSlots([]);
    }
  };

  // ============================================
  // SLOT GENERATION
  // ============================================
  const generateSlots = (dateStr) => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday

    const dayAvailability = availability.find(
      (a) => a.day_of_week === dayOfWeek && a.is_available
    );

    if (!dayAvailability) {
      setAvailableSlots([]);
      return;
    }

    const slots = [];
    const start = toMinutes(dayAvailability.start_time);
    const end = toMinutes(dayAvailability.end_time);

    for (let t = start; t + 30 <= end; t += 30) {
      slots.push({
        start: toTimeString(t),
        end: toTimeString(t + 30),
      });
    }

    setAvailableSlots(slots);
    fetchBookedSlots(selectedDoctor.id, dateStr);
  };

  const toMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const toTimeString = (minutes) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  // ============================================
  // HELPERS
  // ============================================
  const minDate = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  }, []);

  const getInitials = (doc) => {
    const f = doc?.user?.first_name?.[0] || '';
    const l = doc?.user?.last_name?.[0] || '';
    return (f + l).toUpperCase() || 'DR';
  };

  const consultationTypes = [
    {
      value: 'video',
      label: 'Video Call',
      desc: 'Face-to-face video consultation',
      icon: Video,
    },
    {
      value: 'chat',
      label: 'Chat',
      desc: 'Text-based consultation',
      icon: MessageSquare,
    },
    {
      value: 'audio',
      label: 'Audio',
      desc: 'Voice call consultation',
      icon: Stethoscope,
    },
  ];

  // ============================================
  // VALIDATION
  // ============================================
  const canProceed = () => {
    switch (step) {
      case 1:
        return !!selectedDoctor;
      case 2:
        return !!formData.appointment_date && !!formData.start_time;
      case 3:
        return !!formData.consultation_type && formData.reason.trim().length >= 5;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (!canProceed()) {
      setError('Please complete all required fields.');
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, 4));
  };

  const prevStep = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  // ============================================
  // SUBMIT
  // ============================================
  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        doctor: selectedDoctor.id,
        appointment_date: formData.appointment_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        consultation_type: formData.consultation_type,
        reason: formData.reason,
        symptoms: formData.symptoms,
      };

      const res = await api.post('/appointments/', payload);

      if (res.data.success !== false) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/appointments');
        }, 2500);
      } else {
        setError(res.data.message || 'Booking failed.');
      }
    } catch (err) {
      console.error('Booking error:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        Object.values(err.response?.data || {}).flat()[0] ||
        'Failed to book appointment. Please try again.';
      setError(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // STEP RENDERERS
  // ============================================
  const renderStep1 = () => (
    <div className="ab-step-body">
      <h3>Select a Doctor</h3>
      <p className="ab-step-desc">
        Choose the healthcare professional you want to consult
      </p>

      {loading ? (
        <div className="ab-loading">
          <div className="spinner" />
          <p>Loading doctors...</p>
        </div>
      ) : doctors.length === 0 ? (
        <div className="ab-empty">
          <Stethoscope size={40} />
          <p>No doctors available right now</p>
        </div>
      ) : (
        <div className="ab-doctor-grid">
          {doctors.map((doc) => (
            <button
              key={doc.id}
              type="button"
              className={`ab-doctor-card ${
                selectedDoctor?.id === doc.id ? 'selected' : ''
              }`}
              onClick={() => {
                setSelectedDoctor(doc);
                setError('');
              }}
            >
              <div className="ab-doc-avatar">
                {doc.profile_picture ? (
                  <img src={doc.profile_picture} alt="" />
                ) : (
                  getInitials(doc)
                )}
                {doc.available && <span className="ab-doc-online" />}
              </div>
              <div className="ab-doc-info">
                <h4>
                  Dr. {doc.user?.first_name} {doc.user?.last_name}
                </h4>
                <p>{doc.specialization}</p>
                <div className="ab-doc-meta">
                  <span className="ab-doc-rating">
                    <Star size={12} fill="#f59e0b" stroke="#f59e0b" />
                    {parseFloat(doc.rating || 0).toFixed(1)}
                  </span>
                  <span className="ab-doc-fee">
                    ${parseFloat(doc.consultation_fee || 0).toFixed(0)}
                  </span>
                </div>
              </div>
              {selectedDoctor?.id === doc.id && (
                <div className="ab-doc-check">
                  <Check size={16} />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="ab-step-body">
      <h3>Pick a Date & Time</h3>
      <p className="ab-step-desc">
        Choose when you'd like to meet Dr. {selectedDoctor?.user?.last_name}
      </p>

      <div className="ab-form-group">
        <label>
          <Calendar size={16} />
          Appointment Date
        </label>
        <input
          type="date"
          value={formData.appointment_date}
          min={minDate}
          max={maxDate}
          onChange={(e) =>
            setFormData({
              ...formData,
              appointment_date: e.target.value,
              start_time: '',
              end_time: '',
            })
          }
        />
      </div>

      {formData.appointment_date && (
        <div className="ab-form-group">
          <label>
            <Clock size={16} />
            Available Time Slots
          </label>

          {availableSlots.length === 0 ? (
            <div className="ab-no-slots">
              <AlertCircle size={20} />
              <span>
                No slots available on this day. Try another date.
              </span>
            </div>
          ) : (
            <div className="ab-slots-grid">
              {availableSlots.map((slot) => {
                const isBooked = bookedSlots.includes(slot.start);
                const isSelected =
                  formData.start_time === slot.start;
                return (
                  <button
                    key={slot.start}
                    type="button"
                    disabled={isBooked}
                    className={`ab-slot ${isSelected ? 'selected' : ''} ${
                      isBooked ? 'booked' : ''
                    }`}
                    onClick={() => {
                      if (!isBooked) {
                        setFormData({
                          ...formData,
                          start_time: slot.start,
                          end_time: slot.end,
                        });
                      }
                    }}
                  >
                    {slot.start}
                    {isBooked && <span className="ab-slot-tag">Booked</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="ab-step-body">
      <h3>Consultation Details</h3>
      <p className="ab-step-desc">
        Tell us about your visit and choose how you'd like to meet
      </p>

      <div className="ab-form-group">
        <label>
          <Video size={16} />
          Consultation Type
        </label>
        <div className="ab-type-grid">
          {consultationTypes.map((t) => {
            const Icon = t.icon;
            const selected = formData.consultation_type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                className={`ab-type-card ${selected ? 'selected' : ''}`}
                onClick={() =>
                  setFormData({ ...formData, consultation_type: t.value })
                }
              >
                <Icon size={22} />
                <span className="ab-type-label">{t.label}</span>
                <span className="ab-type-desc">{t.desc}</span>
                {selected && (
                  <span className="ab-type-check">
                    <Check size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="ab-form-group">
        <label>
          <FileText size={16} />
          Reason for Visit <span className="req">*</span>
        </label>
        <textarea
          rows={3}
          value={formData.reason}
          onChange={(e) =>
            setFormData({ ...formData, reason: e.target.value })
          }
          placeholder="Briefly describe your concern (e.g. persistent headache, skin rash)"
        />
        <small>{formData.reason.length} / 200 characters</small>
      </div>

      <div className="ab-form-group">
        <label>
          <AlertCircle size={16} />
          Symptoms (optional)
        </label>
        <textarea
          rows={3}
          value={formData.symptoms}
          onChange={(e) =>
            setFormData({ ...formData, symptoms: e.target.value })
          }
          placeholder="List any specific symptoms you're experiencing"
        />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="ab-step-body">
      <h3>Confirm Your Booking</h3>
      <p className="ab-step-desc">Please review your appointment details</p>

      <div className="ab-summary">
        <div className="ab-summary-doctor">
          <div className="ab-summary-avatar">
            {selectedDoctor?.profile_picture ? (
              <img src={selectedDoctor.profile_picture} alt="" />
            ) : (
              getInitials(selectedDoctor)
            )}
          </div>
          <div>
            <h4>
              Dr. {selectedDoctor?.user?.first_name}{' '}
              {selectedDoctor?.user?.last_name}
            </h4>
            <p>{selectedDoctor?.specialization}</p>
          </div>
          <div className="ab-summary-fee">
            <span>Fee</span>
            <strong>
              ${parseFloat(selectedDoctor?.consultation_fee || 0).toFixed(2)}
            </strong>
          </div>
        </div>

        <div className="ab-summary-rows">
          <div className="ab-summary-row">
            <span>
              <Calendar size={15} /> Date
            </span>
            <strong>
              {new Date(formData.appointment_date).toLocaleDateString(
                'en-US',
                {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }
              )}
            </strong>
          </div>
          <div className="ab-summary-row">
            <span>
              <Clock size={15} /> Time
            </span>
            <strong>
              {formData.start_time} – {formData.end_time}
            </strong>
          </div>
          <div className="ab-summary-row">
            <span>
              <Video size={15} /> Type
            </span>
            <strong>
              {consultationTypes.find(
                (t) => t.value === formData.consultation_type
              )?.label || formData.consultation_type}
            </strong>
          </div>
          {formData.reason && (
            <div className="ab-summary-row">
              <span>
                <FileText size={15} /> Reason
              </span>
              <strong className="ab-reason">{formData.reason}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="ab-confirm-note">
        <CheckCircle size={16} />
        By confirming, you agree to the consultation fee of{' '}
        <strong>
          ${parseFloat(selectedDoctor?.consultation_fee || 0).toFixed(2)}
        </strong>
        . Payment will be processed after the appointment.
      </div>
    </div>
  );

  // ============================================
  // SUCCESS SCREEN
  // ============================================
  if (success) {
    return (
      <div className="ab-page">
        <div className="ab-success">
          <div className="ab-success-icon">
            <CheckCircle size={64} />
          </div>
          <h2>Appointment Booked!</h2>
          <p>
            Your appointment with Dr. {selectedDoctor?.user?.last_name} on{' '}
            <strong>
              {new Date(formData.appointment_date).toLocaleDateString()}
            </strong>{' '}
            at <strong>{formData.start_time}</strong> has been requested.
          </p>
          <p className="ab-success-sub">
            You'll receive a confirmation once the doctor approves.
          </p>
          <div className="ab-success-loader">
            <div className="spinner" />
            Redirecting to appointments...
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  const steps = [
    { num: 1, label: 'Doctor' },
    { num: 2, label: 'Date & Time' },
    { num: 3, label: 'Details' },
    { num: 4, label: 'Confirm' },
  ];

  return (
    <div className="ab-page">
      {/* Header */}
      <div className="ab-header">
        <button className="ab-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="ab-title">
          <h1>Book Appointment</h1>
          <p>Schedule a consultation with a doctor</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="ab-stepper">
        {steps.map((s, i) => (
          <React.Fragment key={s.num}>
            <div
              className={`ab-step ${
                step === s.num ? 'active' : ''
              } ${step > s.num ? 'completed' : ''}`}
            >
              <div className="ab-step-circle">
                {step > s.num ? <Check size={16} /> : s.num}
              </div>
              <span className="ab-step-label">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`ab-step-line ${
                  step > s.num ? 'completed' : ''
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Card */}
      <div className="ab-card">
        {error && (
          <div className="ab-error">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ab-error-close">
              <X size={14} />
            </button>
          </div>
        )}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        {/* Footer actions */}
        <div className="ab-actions">
          {step > 1 && (
            <button
              type="button"
              className="ab-btn ab-btn-secondary"
              onClick={prevStep}
              disabled={submitting}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              className="ab-btn ab-btn-primary"
              onClick={nextStep}
              disabled={!canProceed()}
            >
              Continue
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="ab-btn ab-btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-small" />
                  Booking...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Confirm Booking
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentBooking;