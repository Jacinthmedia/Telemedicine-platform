import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  X, Save, Loader, AlertCircle, CheckCircle, Activity, Heart,
  Thermometer, Droplet, FileText, Calendar, Stethoscope, Pill,
} from 'lucide-react';
import './MedicalRecordForm.css';

const MedicalRecordForm = ({ appointment, existingRecord, onClose, onSaved }) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    diagnosis: '',
    symptoms: '',
    treatment: '',
    prescription: '',
    notes: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    temperature: '',
    weight: '',
    height: '',
    follow_up_date: '',
    lab_results_text: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Prefill if editing
  useEffect(() => {
    if (existingRecord) {
      const vitals = existingRecord.vitals || {};
      setFormData({
        diagnosis: existingRecord.diagnosis || '',
        symptoms: existingRecord.symptoms || '',
        treatment: existingRecord.treatment || '',
        prescription: existingRecord.prescription || '',
        notes: existingRecord.notes || '',
        blood_pressure_systolic: existingRecord.blood_pressure_systolic || '',
        blood_pressure_diastolic: existingRecord.blood_pressure_diastolic || '',
        heart_rate: vitals.heart_rate || '',
        temperature: vitals.temperature || '',
        weight: vitals.weight || '',
        height: vitals.height || '',
        follow_up_date: existingRecord.follow_up_date || '',
        lab_results_text: existingRecord.lab_results
          ? JSON.stringify(existingRecord.lab_results)
          : '',
      });
    }
  }, [existingRecord]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const validate = () => {
    if (!formData.diagnosis.trim()) return 'Diagnosis is required';
    if (!formData.treatment.trim()) return 'Treatment plan is required';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        diagnosis: formData.diagnosis.trim(),
        symptoms: formData.symptoms.trim(),
        treatment: formData.treatment.trim(),
        prescription: formData.prescription.trim(),
        notes: formData.notes.trim(),
        follow_up_date: formData.follow_up_date || null,
        vitals: {},
      };

      if (formData.blood_pressure_systolic) {
        payload.blood_pressure_systolic = parseInt(formData.blood_pressure_systolic);
      }
      if (formData.blood_pressure_diastolic) {
        payload.blood_pressure_diastolic = parseInt(formData.blood_pressure_diastolic);
      }
      if (formData.heart_rate) payload.vitals.heart_rate = formData.heart_rate;
      if (formData.temperature) payload.vitals.temperature = formData.temperature;
      if (formData.weight) payload.vitals.weight = formData.weight;
      if (formData.height) payload.vitals.height = formData.height;

      // Attach appointment + patient if creating
      if (!existingRecord && appointment) {
        payload.appointment = appointment.id;
        payload.patient = appointment.patient;
      }

      let res;
      if (existingRecord) {
        res = await api.patch(`/medical-records/${existingRecord.id}/`, payload);
      } else {
        res = await api.post('/medical-records/', payload);
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSaved) onSaved(res.data.data || res.data);
        if (onClose) onClose();
      }, 1200);
    } catch (err) {
      console.error('Save error:', err);
      const data = err.response?.data;
      let msg = 'Failed to save medical record';
      if (data) {
        if (typeof data === 'string') msg = data;
        else if (data.detail) msg = data.detail;
        else if (data.error) msg = data.error;
        else {
          const firstKey = Object.keys(data)[0];
          if (firstKey) {
            const val = data[firstKey];
            msg = `${firstKey}: ${Array.isArray(val) ? val[0] : val}`;
          }
        }
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="mrf-backdrop" onClick={onClose}>
        <div className="mrf-modal mrf-success" onClick={(e) => e.stopPropagation()}>
          <CheckCircle size={56} />
          <h3>Saved</h3>
          <p>The medical record has been {existingRecord ? 'updated' : 'created'}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mrf-backdrop" onClick={onClose}>
      <div className="mrf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mrf-header">
          <div>
            <h2>
              <FileText size={20} />
              {existingRecord ? 'Edit Medical Record' : 'New Medical Record'}
            </h2>
            {appointment && (
              <p className="mrf-subtitle">
                Patient: <strong>{appointment.patient_name}</strong> · {appointment.appointment_date}
              </p>
            )}
          </div>
          <button className="mrf-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mrf-body">
          {error && (
            <div className="mrf-alert error">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* CLINICAL */}
          <div className="mrf-section">
            <h3><Stethoscope size={15} /> Clinical</h3>

            <div className="mrf-field">
              <label>Symptoms</label>
              <textarea
                name="symptoms"
                value={formData.symptoms}
                onChange={handleChange}
                rows={2}
                placeholder="What the patient reported..."
              />
            </div>

            <div className="mrf-field">
              <label>Diagnosis <span className="req">*</span></label>
              <textarea
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleChange}
                rows={2}
                placeholder="Clinical diagnosis..."
                required
              />
            </div>

            <div className="mrf-field">
              <label>Treatment Plan <span className="req">*</span></label>
              <textarea
                name="treatment"
                value={formData.treatment}
                onChange={handleChange}
                rows={3}
                placeholder="Recommended treatment, procedures, lifestyle advice..."
                required
              />
            </div>
          </div>

          {/* VITALS */}
          <div className="mrf-section">
            <h3><Activity size={15} /> Vitals</h3>

            <div className="mrf-row">
              <div className="mrf-field">
                <label>BP Systolic</label>
                <input
                  type="number"
                  name="blood_pressure_systolic"
                  value={formData.blood_pressure_systolic}
                  onChange={handleChange}
                  placeholder="120"
                />
              </div>
              <div className="mrf-field">
                <label>BP Diastolic</label>
                <input
                  type="number"
                  name="blood_pressure_diastolic"
                  value={formData.blood_pressure_diastolic}
                  onChange={handleChange}
                  placeholder="80"
                />
              </div>
            </div>

            <div className="mrf-row">
              <div className="mrf-field">
                <label>Heart Rate (bpm)</label>
                <input
                  type="text"
                  name="heart_rate"
                  value={formData.heart_rate}
                  onChange={handleChange}
                  placeholder="72"
                />
              </div>
              <div className="mrf-field">
                <label>Temperature (°C)</label>
                <input
                  type="text"
                  name="temperature"
                  value={formData.temperature}
                  onChange={handleChange}
                  placeholder="36.8"
                />
              </div>
            </div>

            <div className="mrf-row">
              <div className="mrf-field">
                <label>Weight (kg)</label>
                <input
                  type="text"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  placeholder="70"
                />
              </div>
              <div className="mrf-field">
                <label>Height (cm)</label>
                <input
                  type="text"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  placeholder="170"
                />
              </div>
            </div>
          </div>

          {/* PRESCRIPTION */}
          <div className="mrf-section">
            <h3><Pill size={15} /> Prescription Notes</h3>
            <div className="mrf-field">
              <textarea
                name="prescription"
                value={formData.prescription}
                onChange={handleChange}
                rows={2}
                placeholder="Medications, dosages, frequencies (e.g. Amoxicillin 500mg TID x 5 days)"
              />
            </div>
          </div>

          {/* FOLLOW-UP + NOTES */}
          <div className="mrf-section">
            <h3><Calendar size={15} /> Follow-up & Notes</h3>

            <div className="mrf-field">
              <label>Follow-up Date</label>
              <input
                type="date"
                name="follow_up_date"
                value={formData.follow_up_date}
                onChange={handleChange}
              />
            </div>

            <div className="mrf-field">
              <label>Internal Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Any additional notes..."
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="mrf-actions">
            <button
              type="button"
              className="mrf-btn secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="mrf-btn primary"
              disabled={saving}
            >
              {saving ? (
                <><Loader size={16} className="spin" /> Saving...</>
              ) : (
                <><Save size={16} /> {existingRecord ? 'Update' : 'Save'} Record</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MedicalRecordForm;
