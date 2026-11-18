import React, { useState } from 'react';
import api from '../../api/axios';
import {
  X, Save, Loader, AlertCircle, CheckCircle, Pill,
} from 'lucide-react';
import './PrescriptionForm.css';

const PrescriptionForm = ({ appointment, existingPrescription, onClose, onSaved }) => {
  const [formData, setFormData] = useState({
    medication_name: existingPrescription?.medication_name || '',
    dosage: existingPrescription?.dosage || '',
    frequency: existingPrescription?.frequency || '',
    duration: existingPrescription?.duration || '',
    instructions: existingPrescription?.instructions || '',
    refills: existingPrescription?.refills ?? 0,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const validate = () => {
    if (!formData.medication_name.trim()) return 'Medication name is required';
    if (!formData.dosage.trim()) return 'Dosage is required';
    if (!formData.frequency.trim()) return 'Frequency is required';
    if (!formData.duration.trim()) return 'Duration is required';
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
        medication_name: formData.medication_name.trim(),
        dosage: formData.dosage.trim(),
        frequency: formData.frequency.trim(),
        duration: formData.duration.trim(),
        instructions: formData.instructions.trim(),
        refills: parseInt(formData.refills) || 0,
      };

      if (!existingPrescription && appointment) {
        payload.appointment = appointment.id;
        payload.patient = appointment.patient;
      }

      let res;
      if (existingPrescription) {
        res = await api.patch(`/prescriptions/${existingPrescription.id}/`, payload);
      } else {
        res = await api.post('/prescriptions/', payload);
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSaved) onSaved(res.data.data || res.data);
        if (onClose) onClose();
      }, 1200);
    } catch (err) {
      console.error('Save prescription error:', err);
      const data = err.response?.data;
      let msg = 'Failed to save prescription';
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
      <div className="pxf-backdrop" onClick={onClose}>
        <div className="pxf-modal pxf-success" onClick={(e) => e.stopPropagation()}>
          <CheckCircle size={56} />
          <h3>Prescription Saved</h3>
          <p>The patient has been notified.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pxf-backdrop" onClick={onClose}>
      <div className="pxf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pxf-header">
          <div>
            <h2><Pill size={20} /> {existingPrescription ? 'Edit Prescription' : 'New Prescription'}</h2>
            {appointment && (
              <p className="pxf-subtitle">
                Patient: <strong>{appointment.patient_name}</strong>
              </p>
            )}
          </div>
          <button className="pxf-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pxf-body">
          {error && (
            <div className="pxf-alert error">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="pxf-field">
            <label>Medication Name <span className="req">*</span></label>
            <input
              type="text"
              name="medication_name"
              value={formData.medication_name}
              onChange={handleChange}
              placeholder="e.g. Amoxicillin"
              required
            />
          </div>

          <div className="pxf-row">
            <div className="pxf-field">
              <label>Dosage <span className="req">*</span></label>
              <input
                type="text"
                name="dosage"
                value={formData.dosage}
                onChange={handleChange}
                placeholder="500mg"
                required
              />
            </div>
            <div className="pxf-field">
              <label>Frequency <span className="req">*</span></label>
              <input
                type="text"
                name="frequency"
                value={formData.frequency}
                onChange={handleChange}
                placeholder="3 times daily"
                required
              />
            </div>
          </div>

          <div className="pxf-row">
            <div className="pxf-field">
              <label>Duration <span className="req">*</span></label>
              <input
                type="text"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                placeholder="5 days"
                required
              />
            </div>
            <div className="pxf-field">
              <label>Refills Allowed</label>
              <input
                type="number"
                name="refills"
                value={formData.refills}
                onChange={handleChange}
                placeholder="0"
                min="0"
                max="12"
              />
            </div>
          </div>

          <div className="pxf-field">
            <label>Instructions (Optional)</label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleChange}
              rows={3}
              placeholder="Take with food. Do not skip doses. Complete the full course."
            />
          </div>

          <div className="pxf-actions">
            <button type="button" className="pxf-btn secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="pxf-btn primary" disabled={saving}>
              {saving ? (
                <><Loader size={16} className="spin" /> Saving...</>
              ) : (
                <><Save size={16} /> {existingPrescription ? 'Update' : 'Issue'} Prescription</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrescriptionForm;
