/**
 * PatientProfile.js
 *
 * Assumptions made (adjust if wrong):
 *   - GET    /patients/<id>/           → PatientProfileSerializer payload
 *   - PATCH  /patients/<id>/           → partial update, same serializer
 *   - POST   /documents/               → multipart upload (file, patient, title, document_type)
 *   - POST   /auth/change-password/    → { old_password, new_password, confirm_password }
 *   - The API returns either { data: {...} } or the object directly;
 *     unwrap() handles both.
 *   - profile_picture is read-only on the profile serializer; avatar upload
 *     is treated as display-only in this component.
 *
 * Match with backend read_only_fields on PatientProfileSerializer:
 *   read_only = user, profile_picture, full_name, age, created_at, updated_at
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  User,
  Phone,
  MapPin,
  Calendar,
  Droplet,
  Heart,
  Pill,
  FileText,
  Shield,
  Lock,
  Edit2,
  Save,
  X,
  Upload,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle,
  Activity,
  Stethoscope,
  CreditCard,
  Mail,
  Ruler,
  Weight,
  Loader2,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import './PatientProfile.css';

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

const unwrap = (response) => {
  const body = response?.data ?? response;
  if (body && typeof body === 'object' && 'data' in body) return body.data;
  return body;
};

const extractList = (response) => {
  const body = unwrap(response);
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.results)) return body.results;
  return [];
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return value;
  }
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'P';

const BLOOD_TYPES = [
  ['A+', 'A+'],
  ['A-', 'A-'],
  ['B+', 'B+'],
  ['B-', 'B-'],
  ['AB+', 'AB+'],
  ['AB-', 'AB-'],
  ['O+', 'O+'],
  ['O-', 'O-'],
  ['unknown', 'Unknown'],
];

const GENDERS = [
  ['male', 'Male'],
  ['female', 'Female'],
  ['other', 'Other'],
  ['prefer_not_to_say', 'Prefer not to say'],
];

const DOCUMENT_TYPES = [
  ['medical_report', 'Medical Report'],
  ['lab_result', 'Lab Result'],
  ['prescription', 'Prescription'],
  ['imaging', 'Medical Imaging'],
  ['insurance', 'Insurance'],
  ['identification', 'Identification'],
  ['other', 'Other'],
];

const EMPTY_EDIT_FORM = {
  date_of_birth: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  country: '',
  emergency_contact: '',
  blood_type: 'unknown',
  gender: 'other',
  height: '',
  weight: '',
  allergies: '',
  chronic_conditions: '',
  current_medications: '',
  medical_history: '',
  insurance_provider: '',
  insurance_id: '',
};

// ------------------------------------------------------------
// COMPONENT
// ------------------------------------------------------------

const PatientProfile = () => {
  const { user, setUser, updateUser, changePassword } = useAuth();
  const patientId = user?.profile?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);

  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState(EMPTY_EDIT_FORM);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  const fileInputRef = useRef(null);
  const [pendingUpload, setPendingUpload] = useState(null);

  // Password state
  const [pwForm, setPwForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [pwSaving, setPwSaving] = useState(false);

  // ----------------------------------------------------------
  // LOAD
  // ----------------------------------------------------------
  const loadProfile = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      setError('Patient profile not found.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/patients/${patientId}/`);
      const data = unwrap(res);
      setProfile(data);
      setFormData({
        date_of_birth: data.date_of_birth || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        country: data.country || '',
        emergency_contact: data.emergency_contact || '',
        blood_type: data.blood_type || 'unknown',
        gender: data.gender || 'other',
        height: data.height ?? '',
        weight: data.weight ?? '',
        allergies: data.allergies || '',
        chronic_conditions: data.chronic_conditions || '',
        current_medications: data.current_medications || '',
        medical_history: data.medical_history || '',
        insurance_provider: data.insurance_provider || '',
        insurance_id: data.insurance_id || '',
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to load profile.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  const loadDocuments = useCallback(async () => {
    if (!patientId) return;
    try {
      setDocumentsLoading(true);
      const res = await api.get('/documents/', {
        params: { patient: patientId },
      });
      setDocuments(extractList(res));
    } catch (err) {
      console.error('Failed to load documents:', err);
      // Silent — the tab shows an empty state.
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (activeTab === 'documents') {
      loadDocuments();
    }
  }, [activeTab, loadDocuments]);

  // ----------------------------------------------------------
  // EDIT FLOW
  // ----------------------------------------------------------
  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!patientId) return;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        height: formData.height === '' ? null : formData.height,
        weight: formData.weight === '' ? null : formData.weight,
      };

      const res = await api.patch(`/patients/${patientId}/`, payload);
      const data = unwrap(res) ?? { ...profile, ...payload };

      setProfile((prev) => ({ ...prev, ...data }));
      setEditing(false);
      toast.success('Profile updated successfully.');

      // Keep AuthContext in sync for the top nav / sidebar.
      if (user?.profile) {
        const updatedUser = {
          ...user,
          profile: { ...user.profile, ...data },
        };
        setUser?.(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Save failed:', err);
      const body = err.response?.data;
      let msg = 'Failed to save changes.';
      if (body && typeof body === 'object') {
        const first =
          Object.values(body).flat?.()[0] || Object.values(body)[0];
        if (typeof first === 'string') msg = first;
        else if (Array.isArray(first) && first[0]) msg = first[0];
      }
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    // Reset from profile
    if (profile) {
      setFormData({
        date_of_birth: profile.date_of_birth || '',
        phone: profile.phone || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        country: profile.country || '',
        emergency_contact: profile.emergency_contact || '',
        blood_type: profile.blood_type || 'unknown',
        gender: profile.gender || 'other',
        height: profile.height ?? '',
        weight: profile.weight ?? '',
        allergies: profile.allergies || '',
        chronic_conditions: profile.chronic_conditions || '',
        current_medications: profile.current_medications || '',
        medical_history: profile.medical_history || '',
        insurance_provider: profile.insurance_provider || '',
        insurance_id: profile.insurance_id || '',
      });
    }
  };

  // ----------------------------------------------------------
  // DOCUMENT UPLOAD
  // ----------------------------------------------------------
  const handleFilePick = () => fileInputRef.current?.click();

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File exceeds 20 MB limit.');
      e.target.value = '';
      return;
    }

    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (!allowed.includes(file.type)) {
      toast.error('Only PDF, JPG, PNG, or WEBP files are allowed.');
      e.target.value = '';
      return;
    }

    setPendingUpload({
      file,
      title: file.name.replace(/\.[^.]+$/, ''),
      document_type: 'medical_report',
      description: '',
    });
  };

  const submitUpload = async () => {
    if (!pendingUpload || !patientId) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('patient', String(patientId));
      fd.append('file', pendingUpload.file);
      fd.append('title', pendingUpload.title || pendingUpload.file.name);
      fd.append('document_type', pendingUpload.document_type);
      if (pendingUpload.description)
        fd.append('description', pendingUpload.description);

      await api.post('/documents/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Document uploaded.');
      setPendingUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadDocuments();
    } catch (err) {
      console.error('Upload failed:', err);
      const body = err.response?.data;
      const msg =
        body?.message ||
        body?.detail ||
        (body && typeof body === 'object'
          ? Object.values(body).flat?.()[0]
          : null) ||
        'Upload failed.';
      toast.error(String(msg));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    try {
      await api.delete(`/documents/${docId}/`);
      toast.success('Document deleted.');
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete document.');
    }
  };

  // ----------------------------------------------------------
  // PASSWORD CHANGE
  // ----------------------------------------------------------
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error("New passwords don't match.");
      return;
    }
    if (pwForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }

    setPwSaving(true);
    const result = await changePassword?.(
      pwForm.old_password,
      pwForm.new_password
    );
    setPwSaving(false);

    if (result?.success !== false) {
      setPwForm({
        old_password: '',
        new_password: '',
        confirm_password: '',
      });
    }
  };

  // ----------------------------------------------------------
  // DERIVED
  // ----------------------------------------------------------
  const displayName = useMemo(() => {
    return (
      profile?.full_name ||
      user?.full_name ||
      `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
      user?.username ||
      'Patient'
    );
  }, [profile, user]);

  const avatarUrl = profile?.profile_picture || user?.profile?.profile_picture;

  const age = profile?.age;

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  if (loading) {
    return <LoadingSpinner message="Loading your profile..." />;
  }

  if (error && !profile) {
    return (
      <div className="pp-page">
        <Card>
          <div className="pp-error-state">
            <AlertCircle size={40} />
            <h3>Couldn't load your profile</h3>
            <p>{error}</p>
            <Button onClick={loadProfile} variant="primary">
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="pp-page">
      {/* ==================================================
          HEADER
      ================================================== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="pp-header-card">
          <div className="pp-header">
            <div className="pp-avatar-wrap">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="pp-avatar" />
              ) : (
                <div className="pp-avatar pp-avatar-fallback">
                  {getInitials(displayName)}
                </div>
              )}
            </div>

            <div className="pp-header-info">
              <h1>{displayName}</h1>
              <div className="pp-header-meta">
                <span>
                  <Mail size={14} />
                  {user?.email || '—'}
                </span>
                {age != null && (
                  <span>
                    <Calendar size={14} />
                    {age} years old
                  </span>
                )}
                {profile?.blood_type && profile.blood_type !== 'unknown' && (
                  <span>
                    <Droplet size={14} />
                    {profile.blood_type}
                  </span>
                )}
              </div>
              <div className="pp-header-badges">
                <Badge variant="success">Patient</Badge>
                {profile?.insurance_provider && (
                  <Badge variant="info">
                    <CreditCard size={12} /> {profile.insurance_provider}
                  </Badge>
                )}
              </div>
            </div>

            <div className="pp-header-actions">
              {!editing ? (
                <Button
                  variant="primary"
                  onClick={() => setEditing(true)}
                  size="md"
                >
                  <Edit2 size={16} />
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    <X size={16} />
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    loading={saving}
                  >
                    <Save size={16} />
                    Save Changes
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ==================================================
          TABS
      ================================================== */}
      <div className="pp-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'medical', label: 'Medical Info', icon: Heart },
          { id: 'documents', label: 'Documents', icon: FileText },
          { id: 'security', label: 'Security', icon: Shield },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`pp-tab ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* ==================================================
          TAB CONTENT
      ================================================== */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <OverviewTab
              profile={profile}
              formData={formData}
              editing={editing}
              handleChange={handleChange}
            />
          )}

          {activeTab === 'medical' && (
            <MedicalTab
              profile={profile}
              formData={formData}
              editing={editing}
              handleChange={handleChange}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentsTab
              documents={documents}
              loading={documentsLoading}
              onUpload={handleFilePick}
              onDelete={handleDeleteDocument}
            />
          )}

          {activeTab === 'security' && (
            <SecurityTab
              pwForm={pwForm}
              setPwForm={setPwForm}
              pwSaving={pwSaving}
              onSubmit={handlePasswordSubmit}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Hidden file input for document upload */}
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={handleFileSelected}
      />

      {/* Upload modal */}
      <AnimatePresence>
        {pendingUpload && (
          <UploadModal
            pending={pendingUpload}
            setPending={setPendingUpload}
            uploading={uploading}
            onConfirm={submitUpload}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
// TAB: OVERVIEW
// ============================================================

const OverviewTab = ({ profile, formData, editing, handleChange }) => {
  return (
    <div className="pp-grid">
      <Card title="Personal Information" className="pp-info-card">
        <div className="pp-info-grid">
          <InfoField
            icon={User}
            label="Full Name"
            value={profile?.full_name}
          />
          <InfoField
            icon={Calendar}
            label="Date of Birth"
            value={editing ? null : formatDate(profile?.date_of_birth)}
            edit={
              editing && (
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={handleChange('date_of_birth')}
                />
              )
            }
          />
          <InfoField
            icon={User}
            label="Gender"
            value={editing ? null : capitalize(profile?.gender)}
            edit={
              editing && (
                <select
                  value={formData.gender}
                  onChange={handleChange('gender')}
                >
                  {GENDERS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              )
            }
          />
          <InfoField
            icon={Phone}
            label="Phone"
            value={editing ? null : profile?.phone || '—'}
            edit={
              editing && (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  placeholder="+234..."
                />
              )
            }
          />
          <InfoField
            icon={AlertCircle}
            label="Emergency Contact"
            value={editing ? null : profile?.emergency_contact || '—'}
            edit={
              editing && (
                <input
                  type="text"
                  value={formData.emergency_contact}
                  onChange={handleChange('emergency_contact')}
                  placeholder="Name & phone"
                />
              )
            }
          />
        </div>
      </Card>

      <Card title="Address" className="pp-info-card">
        <div className="pp-info-grid">
          <InfoField
            icon={MapPin}
            label="Street"
            value={editing ? null : profile?.address || '—'}
            edit={
              editing && (
                <input
                  type="text"
                  value={formData.address}
                  onChange={handleChange('address')}
                />
              )
            }
          />
          <InfoField
            icon={MapPin}
            label="City"
            value={editing ? null : profile?.city || '—'}
            edit={
              editing && (
                <input
                  type="text"
                  value={formData.city}
                  onChange={handleChange('city')}
                />
              )
            }
          />
          <InfoField
            icon={MapPin}
            label="State"
            value={editing ? null : profile?.state || '—'}
            edit={
              editing && (
                <input
                  type="text"
                  value={formData.state}
                  onChange={handleChange('state')}
                />
              )
            }
          />
          <InfoField
            icon={MapPin}
            label="Country"
            value={editing ? null : profile?.country || '—'}
            edit={
              editing && (
                <input
                  type="text"
                  value={formData.country}
                  onChange={handleChange('country')}
                />
              )
            }
          />
        </div>
      </Card>
    </div>
  );
};

// ============================================================
// TAB: MEDICAL
// ============================================================

const MedicalTab = ({ profile, formData, editing, handleChange }) => {
  return (
    <div className="pp-grid">
      <Card title="Vitals" className="pp-info-card">
        <div className="pp-info-grid">
          <InfoField
            icon={Droplet}
            label="Blood Type"
            value={editing ? null : profile?.blood_type || '—'}
            edit={
              editing && (
                <select
                  value={formData.blood_type}
                  onChange={handleChange('blood_type')}
                >
                  {BLOOD_TYPES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              )
            }
          />
          <InfoField
            icon={Ruler}
            label="Height (cm)"
            value={editing ? null : profile?.height || '—'}
            edit={
              editing && (
                <input
                  type="number"
                  value={formData.height}
                  onChange={handleChange('height')}
                  step="0.01"
                />
              )
            }
          />
          <InfoField
            icon={Weight}
            label="Weight (kg)"
            value={editing ? null : profile?.weight || '—'}
            edit={
              editing && (
                <input
                  type="number"
                  value={formData.weight}
                  onChange={handleChange('weight')}
                  step="0.01"
                />
              )
            }
          />
        </div>
      </Card>

      <Card title="Medical History" className="pp-info-card">
        <div className="pp-info-grid">
          <InfoField
            icon={AlertCircle}
            label="Allergies"
            value={editing ? null : profile?.allergies || '—'}
            edit={
              editing && (
                <textarea
                  rows={3}
                  value={formData.allergies}
                  onChange={handleChange('allergies')}
                />
              )
            }
          />
          <InfoField
            icon={Activity}
            label="Chronic Conditions"
            value={editing ? null : profile?.chronic_conditions || '—'}
            edit={
              editing && (
                <textarea
                  rows={3}
                  value={formData.chronic_conditions}
                  onChange={handleChange('chronic_conditions')}
                />
              )
            }
          />
          <InfoField
            icon={Pill}
            label="Current Medications"
            value={editing ? null : profile?.current_medications || '—'}
            edit={
              editing && (
                <textarea
                  rows={3}
                  value={formData.current_medications}
                  onChange={handleChange('current_medications')}
                />
              )
            }
          />
          <InfoField
            icon={Stethoscope}
            label="Medical History"
            value={editing ? null : profile?.medical_history || '—'}
            edit={
              editing && (
                <textarea
                  rows={3}
                  value={formData.medical_history}
                  onChange={handleChange('medical_history')}
                />
              )
            }
          />
        </div>
      </Card>

      <Card title="Insurance" className="pp-info-card">
        <div className="pp-info-grid">
          <InfoField
            icon={CreditCard}
            label="Provider"
            value={editing ? null : profile?.insurance_provider || '—'}
            edit={
              editing && (
                <input
                  type="text"
                  value={formData.insurance_provider}
                  onChange={handleChange('insurance_provider')}
                />
              )
            }
          />
          <InfoField
            icon={CreditCard}
            label="Insurance ID"
            value={editing ? null : profile?.insurance_id || '—'}
            edit={
              editing && (
                <input
                  type="text"
                  value={formData.insurance_id}
                  onChange={handleChange('insurance_id')}
                />
              )
            }
          />
        </div>
      </Card>
    </div>
  );
};

// ============================================================
// TAB: DOCUMENTS
// ============================================================

const DocumentsTab = ({ documents, loading, onUpload, onDelete }) => {
  return (
    <Card
      title="My Documents"
      subtitle="Upload and manage your medical documents"
      actions={
        <Button variant="primary" size="sm" onClick={onUpload}>
          <Upload size={14} />
          Upload
        </Button>
      }
      className="pp-docs-card"
    >
      {loading ? (
        <LoadingSpinner message="Loading documents..." fullscreen={false} />
      ) : documents.length === 0 ? (
        <div className="pp-empty-state">
          <FileText size={40} />
          <p>No documents yet</p>
          <Button variant="outline" size="sm" onClick={onUpload}>
            Upload your first document
          </Button>
        </div>
      ) : (
        <ul className="pp-docs-list">
          {documents.map((doc) => (
            <li key={doc.id} className="pp-doc-item">
              <div className="pp-doc-icon">
                <FileText size={20} />
              </div>
              <div className="pp-doc-info">
                <strong>{doc.title}</strong>
                <span>
                  {doc.document_type_display || doc.document_type}
                  {' · '}
                  {formatFileSize(doc.file_size)}
                </span>
              </div>
              <div className="pp-doc-actions">
                {doc.file_url && (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="pp-icon-btn"
                    title="Download"
                  >
                    <Download size={16} />
                  </a>
                )}
                <button
                  type="button"
                  className="pp-icon-btn pp-icon-danger"
                  onClick={() => onDelete(doc.id)}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

// ============================================================
// TAB: SECURITY
// ============================================================

const SecurityTab = ({ pwForm, setPwForm, pwSaving, onSubmit }) => {
  const update = (field) => (e) =>
    setPwForm({ ...pwForm, [field]: e.target.value });

  return (
    <div className="pp-grid">
      <Card title="Change Password" className="pp-info-card">
        <form onSubmit={onSubmit} className="pp-pw-form">
          <div className="pp-field">
            <label>
              <Lock size={14} /> Current Password
            </label>
            <input
              type="password"
              value={pwForm.old_password}
              onChange={update('old_password')}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="pp-field">
            <label>
              <Lock size={14} /> New Password
            </label>
            <input
              type="password"
              value={pwForm.new_password}
              onChange={update('new_password')}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="pp-field">
            <label>
              <Lock size={14} /> Confirm New Password
            </label>
            <input
              type="password"
              value={pwForm.confirm_password}
              onChange={update('confirm_password')}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <Button type="submit" variant="primary" loading={pwSaving}>
            <Shield size={16} />
            Update Password
          </Button>
        </form>
      </Card>

      <Card title="Account Security" className="pp-info-card">
        <div className="pp-security-notes">
          <div className="pp-security-note">
            <CheckCircle size={16} className="pp-ok" />
            <span>All traffic is encrypted over HTTPS</span>
          </div>
          <div className="pp-security-note">
            <CheckCircle size={16} className="pp-ok" />
            <span>Your medical data is never shared without consent</span>
          </div>
          <div className="pp-security-note">
            <CheckCircle size={16} className="pp-ok" />
            <span>Two-factor authentication coming soon</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ============================================================
// SHARED SUBCOMPONENTS
// ============================================================

const InfoField = ({ icon: Icon, label, value, edit }) => (
  <div className="pp-field">
    <label>
      {Icon && <Icon size={14} />} {label}
    </label>
    {edit ? edit : <div className="pp-field-value">{value || '—'}</div>}
  </div>
);

const UploadModal = ({ pending, setPending, uploading, onConfirm }) => {
  const update = (field) => (e) =>
    setPending({ ...pending, [field]: e.target.value });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pp-modal-backdrop"
      onClick={() => !uploading && setPending(null)}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="pp-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pp-modal-header">
          <h3>Upload Document</h3>
          <button
            type="button"
            className="pp-icon-btn"
            onClick={() => !uploading && setPending(null)}
            disabled={uploading}
          >
            <X size={18} />
          </button>
        </div>

        <div className="pp-modal-body">
          <div className="pp-field">
            <label>Title</label>
            <input
              type="text"
              value={pending.title}
              onChange={update('title')}
            />
          </div>

          <div className="pp-field">
            <label>Type</label>
            <select
              value={pending.document_type}
              onChange={update('document_type')}
            >
              {DOCUMENT_TYPES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="pp-field">
            <label>Description (optional)</label>
            <textarea
              rows={3}
              value={pending.description}
              onChange={update('description')}
            />
          </div>

          <div className="pp-file-chip">
            <FileText size={14} />
            <span>{pending.file.name}</span>
            <span className="pp-file-size">
              {formatFileSize(pending.file.size)}
            </span>
          </div>
        </div>

        <div className="pp-modal-actions">
          <Button
            variant="ghost"
            onClick={() => setPending(null)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={uploading}
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="pp-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ------------------------------------------------------------

function capitalize(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

export default PatientProfile;