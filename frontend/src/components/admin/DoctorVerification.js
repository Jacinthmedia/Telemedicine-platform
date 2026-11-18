import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  UserCheck, Search, Filter, CheckCircle, XCircle, AlertCircle,
  Eye, X, Loader, Stethoscope, Building2, Award, Briefcase,
  FileText, Shield, Mail, Phone, Calendar, Download,
  Ban, MessageSquare,
} from 'lucide-react';
import './DoctorVerification.css';

const DoctorVerification = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeFilter, setActiveFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);

  // ============================================
  // FETCH
  // ============================================
  useEffect(() => {
    fetchDoctors();
    // eslint-disable-next-line
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/doctors/');
      const list = res.data.results || res.data.data || res.data || [];
      setDoctors(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load doctors:', err);
      setError('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FILTER
  // ============================================
  useEffect(() => {
    let list = [...doctors];

    if (activeFilter !== 'all') {
      list = list.filter(
        (d) => (d.verification_status || 'pending') === activeFilter
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((d) => {
        const name = `${d.user?.first_name || ''} ${d.user?.last_name || ''}`.toLowerCase();
        return (
          name.includes(q) ||
          d.user?.email?.toLowerCase().includes(q) ||
          d.specialization?.toLowerCase().includes(q) ||
          d.hospital?.toLowerCase().includes(q) ||
          d.license_number?.toLowerCase().includes(q)
        );
      });
    }

    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    setFiltered(list);
  }, [doctors, activeFilter, searchQuery]);

  // ============================================
  // STATS
  // ============================================
  const stats = useMemo(() => ({
    total: doctors.length,
    pending: doctors.filter((d) => (d.verification_status || 'pending') === 'pending').length,
    approved: doctors.filter((d) => d.verification_status === 'approved').length,
    rejected: doctors.filter((d) => d.verification_status === 'rejected').length,
    suspended: doctors.filter((d) => d.verification_status === 'suspended').length,
  }), [doctors]);

  // ============================================
  // ACTIONS
  // ============================================
  const handleApprove = async (doctor) => {
    setProcessing(doctor.id);
    try {
      await api.post(`/doctors/${doctor.id}/approve/`);
      setDoctors((prev) =>
        prev.map((d) =>
          d.id === doctor.id
            ? { ...d, is_verified: true, verification_status: 'approved' }
            : d
        )
      );
      setSuccess(`Dr. ${doctor.user?.first_name} ${doctor.user?.last_name} approved`);
      setSelected(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve doctor');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!showRejectModal) return;
    setProcessing(showRejectModal.id);
    try {
      await api.post(`/doctors/${showRejectModal.id}/reject/`, {
        reason: rejectReason,
      });
      setDoctors((prev) =>
        prev.map((d) =>
          d.id === showRejectModal.id
            ? { ...d, is_verified: false, verification_status: 'rejected' }
            : d
        )
      );
      setSuccess('Doctor rejected');
      setShowRejectModal(null);
      setRejectReason('');
      setSelected(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject doctor');
    } finally {
      setProcessing(null);
    }
  };

  const handleSuspend = async (doctor) => {
    if (!window.confirm(`Suspend Dr. ${doctor.user?.first_name}?`)) return;
    setProcessing(doctor.id);
    try {
      await api.post(`/doctors/${doctor.id}/reject/`);
      setDoctors((prev) =>
        prev.map((d) =>
          d.id === doctor.id
            ? { ...d, is_verified: false, verification_status: 'suspended' }
            : d
        )
      );
      setSuccess('Doctor suspended');
      setSelected(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to suspend');
    } finally {
      setProcessing(null);
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const getInitials = (doc) => {
    const f = doc.user?.first_name?.[0] || '';
    const l = doc.user?.last_name?.[0] || '';
    return (f + l).toUpperCase() || 'DR';
  };

  const getStatusConfig = (status) => {
    const config = {
      pending: { bg: '#fef3c7', color: '#b45309', label: 'Pending' },
      approved: { bg: '#d1fae5', color: '#059669', label: 'Approved' },
      rejected: { bg: '#fee2e2', color: '#dc2626', label: 'Rejected' },
      suspended: { bg: '#f1f5f9', color: '#475569', label: 'Suspended' },
    };
    return config[status] || config.pending;
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="dv-page">
      {/* Header */}
      <div className="dv-header">
        <div>
          <h1>Doctor Verification</h1>
          <p>Review and approve doctor registration requests</p>
        </div>
      </div>

      {/* Pending Alert */}
      {stats.pending > 0 && (
        <div className="dv-alert">
          <AlertCircle size={20} />
          <span>
            <strong>{stats.pending}</strong> doctor{stats.pending !== 1 ? 's' : ''} waiting for verification
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="dv-stats">
        <div className="dv-stat" onClick={() => setActiveFilter('pending')}>
          <div className="dv-stat-icon amber"><AlertCircle size={18} /></div>
          <div>
            <p>Pending</p>
            <h3>{stats.pending}</h3>
          </div>
        </div>
        <div className="dv-stat" onClick={() => setActiveFilter('approved')}>
          <div className="dv-stat-icon green"><CheckCircle size={18} /></div>
          <div>
            <p>Approved</p>
            <h3>{stats.approved}</h3>
          </div>
        </div>
        <div className="dv-stat" onClick={() => setActiveFilter('rejected')}>
          <div className="dv-stat-icon red"><XCircle size={18} /></div>
          <div>
            <p>Rejected</p>
            <h3>{stats.rejected}</h3>
          </div>
        </div>
        <div className="dv-stat" onClick={() => setActiveFilter('all')}>
          <div className="dv-stat-icon blue"><Stethoscope size={18} /></div>
          <div>
            <p>Total</p>
            <h3>{stats.total}</h3>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="dv-toolbar">
        <div className="dv-filters">
          <Filter size={15} />
          {[
            { id: 'pending', label: 'Pending' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'suspended', label: 'Suspended' },
            { id: 'all', label: 'All' },
          ].map((f) => (
            <button
              key={f.id}
              className={`dv-filter-tab ${activeFilter === f.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="dv-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by name, license..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Banners */}
      {error && (
        <div className="dv-banner error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="dv-banner success">
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="dv-loading">
          <Loader size={28} className="spin" />
          <p>Loading doctors...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="dv-empty">
          <UserCheck size={56} />
          <h3>No doctors found</h3>
          <p>
            {activeFilter === 'pending'
              ? 'No pending verifications right now.'
              : 'No doctors match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="dv-grid">
          {filtered.map((doc) => {
            const status = getStatusConfig(doc.verification_status);
            return (
              <div key={doc.id} className="dv-card">
                {/* Status ribbon */}
                <div
                  className="dv-status-ribbon"
                  style={{ background: status.bg, color: status.color }}
                >
                  {status.label}
                </div>

                {/* Header */}
                <div className="dv-card-header">
                  <div className="dv-avatar">
                    {doc.profile_picture ? (
                      <img src={doc.profile_picture} alt="" />
                    ) : (
                      getInitials(doc)
                    )}
                  </div>
                  <div className="dv-card-title">
                    <h3>
                      Dr. {doc.user?.first_name} {doc.user?.last_name}
                    </h3>
                    <p className="dv-specialization">
                      <Stethoscope size={12} /> {doc.specialization}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="dv-card-details">
                  <div className="dv-detail">
                    <Award size={13} />
                    <span>License:</span>
                    <strong>{doc.license_number}</strong>
                  </div>
                  <div className="dv-detail">
                    <Building2 size={13} />
                    <span>Hospital:</span>
                    <strong>{doc.hospital || 'N/A'}</strong>
                  </div>
                  <div className="dv-detail">
                    <Briefcase size={13} />
                    <span>Experience:</span>
                    <strong>{doc.years_experience || 0} years</strong>
                  </div>
                  <div className="dv-detail">
                    <Calendar size={13} />
                    <span>Applied:</span>
                    <strong>{formatDate(doc.created_at)}</strong>
                  </div>
                </div>

                {/* Actions */}
                <div className="dv-card-actions">
                  <button
                    className="dv-btn-secondary"
                    onClick={() => setSelected(doc)}
                  >
                    <Eye size={14} /> Review
                  </button>
                  {doc.verification_status === 'pending' && (
                    <>
                      <button
                        className="dv-btn-danger"
                        onClick={() => setShowRejectModal(doc)}
                        disabled={processing === doc.id}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                      <button
                        className="dv-btn-primary"
                        onClick={() => handleApprove(doc)}
                        disabled={processing === doc.id}
                      >
                        {processing === doc.id ? (
                          <Loader size={14} className="spin" />
                        ) : (
                          <CheckCircle size={14} />
                        )}
                        Approve
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ REVIEW MODAL ============ */}
      {selected && (
        <div className="dv-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="dv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dv-modal-header">
              <div className="dv-modal-avatar">
                {selected.profile_picture ? (
                  <img src={selected.profile_picture} alt="" />
                ) : (
                  getInitials(selected)
                )}
              </div>
              <div className="dv-modal-title">
                <h2>
                  Dr. {selected.user?.first_name} {selected.user?.last_name}
                </h2>
                <p>{selected.specialization}</p>
              </div>
              <button className="dv-modal-close" onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="dv-modal-body">
              {/* Status */}
              <div
                className="dv-modal-status"
                style={{
                  background: getStatusConfig(selected.verification_status).bg,
                  color: getStatusConfig(selected.verification_status).color,
                }}
              >
                {getStatusConfig(selected.verification_status).label}
              </div>

              {/* Contact */}
              <div className="dv-modal-section">
                <h4><Shield size={14} /> Contact Information</h4>
                <div className="dv-modal-row">
                  <span><Mail size={12} /> Email</span>
                  <strong>{selected.user?.email || 'N/A'}</strong>
                </div>
                <div className="dv-modal-row">
                  <span><Phone size={12} /> Username</span>
                  <strong>@{selected.user?.username}</strong>
                </div>
              </div>

              {/* Professional */}
              <div className="dv-modal-section">
                <h4><Stethoscope size={14} /> Professional Info</h4>
                <div className="dv-modal-row">
                  <span>Specialization</span>
                  <strong>{selected.specialization}</strong>
                </div>
                <div className="dv-modal-row">
                  <span>License Number</span>
                  <strong>{selected.license_number}</strong>
                </div>
                <div className="dv-modal-row">
                  <span>Hospital</span>
                  <strong>{selected.hospital || 'N/A'}</strong>
                </div>
                <div className="dv-modal-row">
                  <span>Experience</span>
                  <strong>{selected.years_experience || 0} years</strong>
                </div>
                <div className="dv-modal-row">
                  <span>Consultation Fee</span>
                  <strong>₦{parseFloat(selected.consultation_fee || 0).toLocaleString()}</strong>
                </div>
                <div className="dv-modal-row">
                  <span>Applied</span>
                  <strong>{formatDate(selected.created_at)}</strong>
                </div>
              </div>

              {/* Bio */}
              {selected.bio && (
                <div className="dv-modal-section">
                  <h4><FileText size={14} /> Biography</h4>
                  <p className="dv-bio">{selected.bio}</p>
                </div>
              )}

              {selected.education && (
                <div className="dv-modal-section">
                  <h4><Award size={14} /> Education</h4>
                  <p className="dv-bio">{selected.education}</p>
                </div>
              )}

              {selected.certifications && (
                <div className="dv-modal-section">
                  <h4><Award size={14} /> Certifications</h4>
                  <p className="dv-bio">{selected.certifications}</p>
                </div>
              )}

              {/* Availability */}
              <div className="dv-modal-section">
                <h4><Calendar size={14} /> Availability Status</h4>
                <div className="dv-modal-row">
                  <span>Currently Accepting</span>
                  <strong style={{ color: selected.available ? '#10b981' : '#ef4444' }}>
                    {selected.available ? 'Yes' : 'No'}
                  </strong>
                </div>
              </div>
            </div>

            <div className="dv-modal-footer">
              <button
                className="dv-btn-secondary"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
              {selected.verification_status === 'pending' && (
                <>
                  <button
                    className="dv-btn-danger"
                    onClick={() => {
                      setShowRejectModal(selected);
                      setSelected(null);
                    }}
                  >
                    <XCircle size={14} /> Reject
                  </button>
                  <button
                    className="dv-btn-primary"
                    onClick={() => handleApprove(selected)}
                    disabled={processing === selected.id}
                  >
                    {processing === selected.id ? (
                      <><Loader size={14} className="spin" /> Approving...</>
                    ) : (
                      <><CheckCircle size={14} /> Approve</>
                    )}
                  </button>
                </>
              )}
              {selected.verification_status === 'approved' && (
                <button
                  className="dv-btn-danger"
                  onClick={() => handleSuspend(selected)}
                >
                  <Ban size={14} /> Suspend
                </button>
              )}
              {selected.verification_status === 'rejected' && (
                <button
                  className="dv-btn-primary"
                  onClick={() => handleApprove(selected)}
                >
                  <CheckCircle size={14} /> Approve Anyway
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ REJECT MODAL ============ */}
      {showRejectModal && (
        <div className="dv-modal-backdrop" onClick={() => setShowRejectModal(null)}>
          <div className="dv-modal sm" onClick={(e) => e.stopPropagation()}>
            <div className="dv-reject-body">
              <div className="dv-reject-icon">
                <XCircle size={28} />
              </div>
              <h3>Reject Doctor?</h3>
              <p>
                Dr. <strong>{showRejectModal.user?.first_name} {showRejectModal.user?.last_name}</strong>{' '}
                will be notified and cannot accept appointments until approved.
              </p>

              <div className="dv-reject-reason">
                <label>Reason (optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. License could not be verified"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            </div>
            <div className="dv-modal-footer">
              <button
                className="dv-btn-secondary"
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                className="dv-btn-danger"
                onClick={handleReject}
                disabled={processing}
              >
                {processing ? (
                  <><Loader size={14} className="spin" /> Rejecting...</>
                ) : (
                  <><XCircle size={14} /> Confirm Reject</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorVerification;