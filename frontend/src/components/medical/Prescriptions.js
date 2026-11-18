import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  Pill, Search, Filter, Calendar, Stethoscope, Clock, FileText,
  RefreshCw, X, AlertCircle, Loader, CheckCircle, Info,
  ChevronRight, Download, Printer, Plus, Activity,
} from 'lucide-react';
import './Prescriptions.css';

const Prescriptions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || 'patient';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [prescriptions, setPrescriptions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeFilter, setActiveFilter] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [refilling, setRefilling] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // ============================================
  // FETCH
  // ============================================
  useEffect(() => {
    fetchPrescriptions();
    // eslint-disable-next-line
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/prescriptions/');
      const list = res.data.results || res.data.data || res.data || [];
      setPrescriptions(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to load prescriptions'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FILTER
  // ============================================
  useEffect(() => {
    let list = [...prescriptions];

    if (activeFilter === 'active') {
      list = list.filter((p) => p.is_active);
    } else if (activeFilter === 'expired') {
      list = list.filter((p) => !p.is_active);
    } else if (activeFilter === 'refillable') {
      list = list.filter(
        (p) => p.is_active && (p.refills_remaining ?? (p.refills - p.refills_used)) > 0
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => {
        const doctor = `${p.doctor?.user?.first_name || ''} ${p.doctor?.user?.last_name || ''}`.toLowerCase();
        const patient = `${p.patient?.user?.first_name || ''} ${p.patient?.user?.last_name || ''}`.toLowerCase();
        return (
          p.medication_name?.toLowerCase().includes(q) ||
          p.dosage?.toLowerCase().includes(q) ||
          p.instructions?.toLowerCase().includes(q) ||
          doctor.includes(q) ||
          patient.includes(q)
        );
      });
    }

    list.sort((a, b) => new Date(b.issued_at) - new Date(a.issued_at));
    setFiltered(list);
  }, [prescriptions, activeFilter, searchQuery]);

  // ============================================
  // REFILL REQUEST
  // ============================================
  const requestRefill = async (id) => {
    setRefilling(id);
    try {
      await api.post(`/prescriptions/${id}/refill/`);
      setSuccessMsg('Refill requested successfully');
      // Optimistically update
      setPrescriptions((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, refills_used: (p.refills_used || 0) + 1 } : p
        )
      );
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to request refill'
      );
      setTimeout(() => setError(''), 3500);
    } finally {
      setRefilling(null);
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

  const getRefillsRemaining = (p) => {
    if (p.refills_remaining !== undefined) return p.refills_remaining;
    return Math.max(0, (p.refills || 0) - (p.refills_used || 0));
  };

  const stats = useMemo(() => ({
    total: prescriptions.length,
    active: prescriptions.filter((p) => p.is_active).length,
    refillable: prescriptions.filter(
      (p) => p.is_active && getRefillsRemaining(p) > 0
    ).length,
    expired: prescriptions.filter((p) => !p.is_active).length,
  }), [prescriptions]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="rx-page">
      {/* Header */}
      <div className="rx-header">
        <div>
          <h1>Prescriptions</h1>
          <p>
            {role === 'doctor'
              ? 'Prescriptions you have issued'
              : 'Your prescribed medications'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="rx-stats">
        <StatBox label="Total" value={stats.total} icon={Pill} color="green" />
        <StatBox label="Active" value={stats.active} icon={CheckCircle} color="blue" />
        <StatBox label="Refillable" value={stats.refillable} icon={RefreshCw} color="amber" />
        <StatBox label="Expired" value={stats.expired} icon={Clock} color="gray" />
      </div>

      {/* Toolbar */}
      <div className="rx-toolbar">
        <div className="rx-filters">
          <Filter size={15} />
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'refillable', label: 'Refillable' },
            { id: 'expired', label: 'Expired' },
          ].map((f) => (
            <button
              key={f.id}
              className={`rx-filter-tab ${activeFilter === f.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="rx-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search medication or doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rx-banner error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}
      {successMsg && (
        <div className="rx-banner success">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="rx-loading">
          <Loader size={28} className="spin" />
          <p>Loading prescriptions...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rx-empty">
          <Pill size={56} />
          <h3>No prescriptions found</h3>
          <p>
            {prescriptions.length === 0
              ? 'Prescriptions from your doctors will appear here.'
              : 'No prescriptions match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="rx-grid">
          {filtered.map((p) => {
            const refills = getRefillsRemaining(p);
            const canRefill = p.is_active && refills > 0 && role === 'patient';

            return (
              <div
                key={p.id}
                className={`rx-card ${!p.is_active ? 'expired' : ''}`}
              >
                <div className="rx-card-header">
                  <div className="rx-pill-icon">
                    <Pill size={20} />
                  </div>
                  <div className="rx-card-title">
                    <h3>{p.medication_name}</h3>
                    <span className="rx-dosage">{p.dosage}</span>
                  </div>
                  <div className={`rx-status ${p.is_active ? 'active' : 'expired'}`}>
                    {p.is_active ? 'Active' : 'Expired'}
                  </div>
                </div>

                <div className="rx-card-details">
                  <div className="rx-detail">
                    <Clock size={13} />
                    <div>
                      <span>Frequency</span>
                      <strong>{p.frequency}</strong>
                    </div>
                  </div>
                  <div className="rx-detail">
                    <Calendar size={13} />
                    <div>
                      <span>Duration</span>
                      <strong>{p.duration}</strong>
                    </div>
                  </div>
                  {p.doctor && (
                    <div className="rx-detail">
                      <Stethoscope size={13} />
                      <div>
                        <span>Prescribed by</span>
                        <strong>
                          Dr. {p.doctor.user?.first_name} {p.doctor.user?.last_name}
                        </strong>
                      </div>
                    </div>
                  )}
                  <div className="rx-detail">
                    <FileText size={13} />
                    <div>
                      <span>Issued</span>
                      <strong>{formatDate(p.issued_at)}</strong>
                    </div>
                  </div>
                </div>

                {p.instructions && (
                  <div className="rx-instructions">
                    <Info size={13} />
                    <p>{p.instructions}</p>
                  </div>
                )}

                <div className="rx-refills">
                  <div className="rx-refills-bar">
                    <div
                      className="rx-refills-fill"
                      style={{
                        width: `${(refills / Math.max(p.refills || 1, 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="rx-refills-text">
                    <RefreshCw size={12} />
                    {refills} of {p.refills || 0} refills remaining
                  </span>
                </div>

                <div className="rx-card-actions">
                  <button
                    className="rx-btn-secondary"
                    onClick={() => setSelected(p)}
                  >
                    View Details
                  </button>
                  {canRefill && (
                    <button
                      className="rx-btn-primary"
                      onClick={() => requestRefill(p.id)}
                      disabled={refilling === p.id}
                    >
                      {refilling === p.id ? (
                        <><Loader size={14} className="spin" /> Requesting...</>
                      ) : (
                        <><RefreshCw size={14} /> Request Refill</>
                      )}
                    </button>
                  )}
                  {!p.is_active && (
                    <button className="rx-btn-primary" disabled>
                      Prescription Expired
                    </button>
                  )}
                  {p.is_active && refills === 0 && role === 'patient' && (
                    <button className="rx-btn-secondary" disabled>
                      No Refills Left
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ DETAIL MODAL ============ */}
      {selected && (
        <div className="rx-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="rx-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rx-modal-header">
              <div>
                <h2>{selected.medication_name}</h2>
                <p>{selected.dosage} · {selected.frequency}</p>
              </div>
              <button className="rx-modal-close" onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="rx-modal-body">
              <div className="rx-modal-section">
                <h4><Activity size={14} /> Prescription Details</h4>
                <div className="rx-info-grid">
                  <InfoRow label="Medication" value={selected.medication_name} />
                  <InfoRow label="Dosage" value={selected.dosage} />
                  <InfoRow label="Frequency" value={selected.frequency} />
                  <InfoRow label="Duration" value={selected.duration} />
                  <InfoRow label="Issued" value={formatDate(selected.issued_at)} />
                  <InfoRow
                    label="Status"
                    value={selected.is_active ? 'Active' : 'Expired'}
                  />
                </div>
              </div>

              {selected.doctor && (
                <div className="rx-modal-section">
                  <h4><Stethoscope size={14} /> Prescribed By</h4>
                  <div className="rx-doctor-card">
                    <div className="rx-doctor-avatar">
                      {selected.doctor.user?.first_name?.[0]}
                      {selected.doctor.user?.last_name?.[0]}
                    </div>
                    <div>
                      <h5>
                        Dr. {selected.doctor.user?.first_name}{' '}
                        {selected.doctor.user?.last_name}
                      </h5>
                      <p>{selected.doctor.specialization} · {selected.doctor.hospital}</p>
                    </div>
                  </div>
                </div>
              )}

              {selected.instructions && (
                <div className="rx-modal-section">
                  <h4><Info size={14} /> Instructions</h4>
                  <p className="rx-modal-instructions">{selected.instructions}</p>
                </div>
              )}

              <div className="rx-modal-section">
                <h4><RefreshCw size={14} /> Refills</h4>
                <div className="rx-modal-refills">
                  <span>
                    <strong>{getRefillsRemaining(selected)}</strong> of{' '}
                    <strong>{selected.refills || 0}</strong> refills remaining
                  </span>
                  <div className="rx-modal-refills-bar">
                    <div
                      className="rx-modal-refills-fill"
                      style={{
                        width: `${(getRefillsRemaining(selected) / Math.max(selected.refills || 1, 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rx-modal-footer">
              <button className="rx-btn-secondary" title="Print (coming soon)">
                <Printer size={14} /> Print
              </button>
              <button className="rx-btn-secondary" title="Download (coming soon)">
                <Download size={14} /> Download PDF
              </button>
              {role === 'patient' && selected.is_active && getRefillsRemaining(selected) > 0 && (
                <button
                  className="rx-btn-primary"
                  onClick={() => {
                    requestRefill(selected.id);
                    setSelected(null);
                  }}
                >
                  <RefreshCw size={14} /> Request Refill
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatBox = ({ label, value, icon: Icon, color }) => (
  <div className="rx-stat">
    <div className={`rx-stat-icon ${color}`}>
      <Icon size={18} />
    </div>
    <div>
      <p>{label}</p>
      <h3>{value}</h3>
    </div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="rx-info-row">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export default Prescriptions;