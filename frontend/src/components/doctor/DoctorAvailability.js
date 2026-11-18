import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  ArrowLeft, Clock, Calendar, Save, Loader, CheckCircle,
  AlertCircle, Power, Zap, Coffee, Sunset, Trash2,
} from 'lucide-react';
import './DoctorAvailability.css';

const DAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const DEFAULT_SCHEDULE = DAYS.map((d) => ({
  day_of_week: d.value,
  start_time: '09:00',
  end_time: '17:00',
  is_available: d.value >= 1 && d.value <= 5,
}));

const DoctorAvailability = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingTop, setTogglingTop] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [available, setAvailable] = useState(true);
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);

  const doctorId =
    user?.profile_id ||
    user?.doctor_profile_id ||
    user?.profile?.id ||
    user?.id;

  useEffect(() => {
    fetchAvailability();
    // eslint-disable-next-line
  }, []);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      setError('');

      if (!doctorId) {
        setError('Could not determine your doctor profile');
        return;
      }

      const res = await api.get(`/doctor-availability/?doctor=${doctorId}`);
      const list = res.data.results || res.data.data || res.data || [];

      const merged = DEFAULT_SCHEDULE.map((d) => {
        const found = Array.isArray(list)
          ? list.find((x) => x.day_of_week === d.day_of_week)
          : null;
        return found
          ? {
              day_of_week: d.day_of_week,
              start_time: (found.start_time || '09:00').slice(0, 5),
              end_time: (found.end_time || '17:00').slice(0, 5),
              is_available: found.is_available,
            }
          : d;
      });

      setSchedule(merged);

      const meRes = await api.get('/auth/me/');
      const me = meRes.data.data || meRes.data;
      if (me?.profile?.available !== undefined) {
        setAvailable(me.profile.available);
      }
    } catch (err) {
      console.error('Error loading availability:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to load availability'
      );
    } finally {
      setLoading(false);
    }
  };

  const updateDay = (dayOfWeek, field, value) => {
    setSchedule((prev) =>
      prev.map((d) =>
        d.day_of_week === dayOfWeek ? { ...d, [field]: value } : d
      )
    );
  };

  const toggleDay = (dayOfWeek) => {
    setSchedule((prev) =>
      prev.map((d) =>
        d.day_of_week === dayOfWeek
          ? { ...d, is_available: !d.is_available }
          : d
      )
    );
  };

  const applyPreset = (preset) => {
    const presets = {
      '9-5': { start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] },
      morning: { start: '08:00', end: '12:00', days: [1, 2, 3, 4, 5] },
      evening: { start: '16:00', end: '21:00', days: [1, 2, 3, 4, 5] },
      weekend: { start: '10:00', end: '16:00', days: [0, 6] },
    };
    const p = presets[preset];
    if (!p) return;

    setSchedule((prev) =>
      prev.map((d) => ({
        ...d,
        start_time: p.start,
        end_time: p.end,
        is_available: p.days.includes(d.day_of_week),
      }))
    );
  };

  const clearAll = () => {
    setSchedule((prev) =>
      prev.map((d) => ({ ...d, is_available: false }))
    );
  };

  const validate = () => {
    for (const d of schedule) {
      if (!d.is_available) continue;
      if (!d.start_time || !d.end_time) {
        return `${DAYS.find((x) => x.value === d.day_of_week).label}: start and end times are required`;
      }
      if (d.start_time >= d.end_time) {
        return `${DAYS.find((x) => x.value === d.day_of_week).label}: end time must be after start time`;
      }
    }
    return '';
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const activeDays = schedule.filter((d) => d.is_available);

      await Promise.all(
        activeDays.map((d) =>
          api.post('/doctors/availability/', {
            day_of_week: d.day_of_week,
            start_time: d.start_time,
            end_time: d.end_time,
            is_available: true,
          })
        )
      );

      const inactiveDays = schedule.filter((d) => !d.is_available);
      await Promise.all(
        inactiveDays.map((d) =>
          api.post('/doctors/availability/', {
            day_of_week: d.day_of_week,
            start_time: d.start_time || '09:00',
            end_time: d.end_time || '17:00',
            is_available: false,
          })
        )
      );

      setSuccess('Availability updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to save availability'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTop = async () => {
    setTogglingTop(true);
    setError('');

    try {
      await api.post('/doctors/update-availability/', {
        available: !available,
      });
      setAvailable(!available);
    } catch (err) {
      console.error('Toggle failed:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to update status'
      );
    } finally {
      setTogglingTop(false);
    }
  };

  if (loading) {
    return (
      <div className="da-loading">
        <div className="spinner" />
        <p>Loading availability...</p>
      </div>
    );
  }

  return (
    <div className="da-page">
      <div className="da-header">
        <button className="da-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>
        <div>
          <h1>My Availability</h1>
          <p>Set your weekly working hours for patient bookings</p>
        </div>
        <button
          className="da-btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader size={16} className="spin" /> Saving...
            </>
          ) : (
            <>
              <Save size={16} /> Save Changes
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="da-banner error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="da-banner success">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      <div className="da-status-card">
        <div className="da-status-left">
          <div className={`da-status-icon ${available ? 'online' : 'offline'}`}>
            <Power size={22} />
          </div>
          <div>
            <h3>{available ? 'Accepting Appointments' : 'Not Accepting Appointments'}</h3>
            <p>
              {available
                ? 'Patients can see and book appointments with you'
                : 'You will not appear in the available doctors list'}
            </p>
          </div>
        </div>
        <button
          className={`da-toggle ${available ? 'on' : 'off'}`}
          onClick={handleToggleTop}
          disabled={togglingTop}
        >
          <span className="da-toggle-knob" />
        </button>
      </div>

      <div className="da-presets">
        <span className="da-presets-label">
          <Zap size={14} /> Quick presets
        </span>
        <button onClick={() => applyPreset('9-5')}>9–5 (Mon–Fri)</button>
        <button onClick={() => applyPreset('morning')}>
          <Coffee size={12} /> Morning (Mon–Fri)
        </button>
        <button onClick={() => applyPreset('evening')}>
          <Sunset size={12} /> Evening (Mon–Fri)
        </button>
        <button onClick={() => applyPreset('weekend')}>Weekend only</button>
        <button className="da-preset-clear" onClick={clearAll}>
          <Trash2 size={12} /> Clear all
        </button>
      </div>

      <div className="da-schedule">
        <div className="da-schedule-header">
          <h3>
            <Calendar size={18} /> Weekly Schedule
          </h3>
          <span className="da-schedule-hint">
            <Clock size={13} /> 30-minute consultation slots
          </span>
        </div>

        <div className="da-days">
          {schedule.map((day) => {
            const meta = DAYS.find((x) => x.value === day.day_of_week);
            return (
              <div
                key={day.day_of_week}
                className={`da-day ${day.is_available ? 'active' : 'inactive'}`}
              >
                <label className="da-day-toggle">
                  <input
                    type="checkbox"
                    checked={day.is_available}
                    onChange={() => toggleDay(day.day_of_week)}
                  />
                  <span className="da-day-checkbox" />
                </label>

                <div className="da-day-name">
                  <span className="da-day-long">{meta.label}</span>
                  <span className="da-day-short">{meta.short}</span>
                </div>

                <div className="da-day-times">
                  <input
                    type="time"
                    value={day.start_time}
                    onChange={(e) =>
                      updateDay(day.day_of_week, 'start_time', e.target.value)
                    }
                    disabled={!day.is_available}
                  />
                  <span className="da-time-sep">to</span>
                  <input
                    type="time"
                    value={day.end_time}
                    onChange={(e) =>
                      updateDay(day.day_of_week, 'end_time', e.target.value)
                    }
                    disabled={!day.is_available}
                  />
                </div>

                <div className="da-day-status">
                  {day.is_available ? (
                    <span className="da-pill on">Open</span>
                  ) : (
                    <span className="da-pill off">Closed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DoctorAvailability;