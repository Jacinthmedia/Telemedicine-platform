import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  FileText, Search, Filter, Calendar, User, Stethoscope,
  Activity, Heart, Thermometer, Droplet, Eye, Download,
  ChevronRight, X, AlertCircle, Loader, Clock, Plus,
  TrendingUp, Pill,
} from 'lucide-react';
import './MedicalRecords.css';

const MedicalRecords = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || 'patient';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  // ============================================
  // FETCH
  // ============================================
  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/medical-records/');
      const list = res.data.results || res.data.data || res.data || [];
      setRecords(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load records:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to load medical records'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FILTER
  // ============================================
  useEffect(() => {
    let list = [...records];

    if (activeFilter === 'recent') {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 3);
      list = list.filter((r) => new Date(r.record_date) >= cutoff);
    } else if (activeFilter === 'followup') {
      list = list.filter((r) => r.follow_up_date);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => {
        const doctor = `${r.doctor?.user?.first_name || ''} ${r.doctor?.user?.last_name || ''}`.toLowerCase();
        return (
          doctor.includes(q) ||
          r.diagnosis?.toLowerCase().includes(q) ||
          r.symptoms?.toLowerCase().includes(q) ||
          r.treatment?.toLowerCase().includes(q) ||
          r.prescription?.toLowerCase().includes(q)
        );
      });
    }

    list.sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
    setFiltered(list);
  }, [records, activeFilter, searchQuery]);

  // ============================================
  // HELPERS
  // ============================================
  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const formatDateTime = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getInitials = (obj) => {
    const f = obj?.user?.first_name?.[0] || '';
    const l = obj?.user?.last_name?.[0] || '';
    return (f + l).toUpperCase() || 'DR';
  };

  const getBpDisplay = (r) => {
    if (!r.blood_pressure_systolic || !r.blood_pressure_diastolic) return null;
    return `${r.blood_pressure_systolic}/${r.blood_pressure_diastolic}`;
  };

  const getStats = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return {
      total: records.length,
      last6Months: records.filter((r) => new Date(r.record_date) >= sixMonthsAgo).length,
      withFollowUp: records.filter((r) => r.follow_up_date).length,
      withPrescription: records.filter((r) => r.prescription).length,
    };
  }, [records]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="mr-page">
      {/* Header */}
      <div className="mr-header">
        <div>
          <h1>Medical Records</h1>
          <p>
            {role === 'doctor'
              ? 'Patient consultation records you have created'
              : 'Your complete health history'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mr-stats">
        <div className="mr-stat">
          <div className="mr-stat-icon green">
            <FileText size={20} />
          </div>
          <div>
            <p>Total Records</p>
            <h3>{getStats.total}</h3>
          </div>
        </div>
        <div className="mr-stat">
          <div className="mr-stat-icon blue">
            <TrendingUp size={20} />
          </div>
          <div>
            <p>Last 6 Months</p>
            <h3>{getStats.last6Months}</h3>
          </div>
        </div>
        <div className="mr-stat">
          <div className="mr-stat-icon amber">
            <Calendar size={20} />
          </div>
          <div>
            <p>Follow-ups Scheduled</p>
            <h3>{getStats.withFollowUp}</h3>
          </div>
        </div>
        <div className="mr-stat">
          <div className="mr-stat-icon purple">
            <Pill size={20} />
          </div>
          <div>
            <p>With Prescription</p>
            <h3>{getStats.withPrescription}</h3>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mr-toolbar">
        <div className="mr-filters">
          <Filter size={15} />
          {[
            { id: 'all', label: 'All Records' },
            { id: 'recent', label: 'Recent (3 months)' },
            { id: 'followup', label: 'With Follow-up' },
          ].map((f) => (
            <button
              key={f.id}
              className={`mr-filter-tab ${activeFilter === f.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mr-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by diagnosis, symptoms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mr-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="mr-loading">
          <Loader size={28} className="spin" />
          <p>Loading records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mr-empty">
          <FileText size={56} />
          <h3>No medical records found</h3>
          <p>
            {records.length === 0
              ? 'Your consultation records will appear here once created.'
              : 'No records match your filters.'}
          </p>
        </div>
      ) : (
        <div className="mr-list">
          {filtered.map((record) => (
            <div
              key={record.id}
              className="mr-card"
              onClick={() => setSelectedRecord(record)}
            >
              {/* Left: date */}
              <div className="mr-card-date">
                <div className="mr-date-day">
                  {new Date(record.record_date).getDate()}
                </div>
                <div className="mr-date-month">
                  {new Date(record.record_date).toLocaleDateString('en-US', { month: 'short' })}
                </div>
                <div className="mr-date-year">
                  {new Date(record.record_date).getFullYear()}
                </div>
              </div>

              {/* Middle: main info */}
              <div className="mr-card-main">
                <div className="mr-card-top">
                  <h3>
                    {record.diagnosis || 'General Consultation'}
                  </h3>
                  {record.follow_up_date && (
                    <span className="mr-followup-tag">
                      <Calendar size={11} /> Follow-up: {formatDate(record.follow_up_date)}
                    </span>
                  )}
                </div>

                <div className="mr-card-meta">
                  {record.doctor && (
                    <span>
                      <Stethoscope size={12} />
                      Dr. {record.doctor.user?.first_name} {record.doctor.user?.last_name}
                      {record.doctor.specialization && ` · ${record.doctor.specialization}`}
                    </span>
                  )}
                  <span>
                    <Clock size={12} /> {formatDateTime(record.record_date)}
                  </span>
                </div>

                {record.symptoms && (
                  <p className="mr-card-symptoms">
                    <strong>Symptoms:</strong> {record.symptoms.slice(0, 120)}
                    {record.symptoms.length > 120 && '...'}
                  </p>
                )}

                {/* Vitals mini strip */}
                {(getBpDisplay(record) || record.vitals?.temperature || record.vitals?.heart_rate) && (
                  <div className="mr-vitals-mini">
                    {getBpDisplay(record) && (
                      <span className="mr-vital-chip">
                        <Activity size={11} /> BP {getBpDisplay(record)}
                      </span>
                    )}
                    {record.vitals?.heart_rate && (
                      <span className="mr-vital-chip">
                        <Heart size={11} /> {record.vitals.heart_rate} bpm
                      </span>
                    )}
                    {record.vitals?.temperature && (
                      <span className="mr-vital-chip">
                        <Thermometer size={11} /> {record.vitals.temperature}°C
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Right: arrow */}
              <div className="mr-card-arrow">
                <ChevronRight size={20} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============ DETAIL MODAL ============ */}
      {selectedRecord && (
        <div className="mr-modal-backdrop" onClick={() => setSelectedRecord(null)}>
          <div className="mr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mr-modal-header">
              <div>
                <h2>{selectedRecord.diagnosis || 'General Consultation'}</h2>
                <p>
                  <Clock size={12} /> {formatDateTime(selectedRecord.record_date)}
                </p>
              </div>
              <button className="mr-modal-close" onClick={() => setSelectedRecord(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="mr-modal-body">
              {/* Doctor card */}
              {selectedRecord.doctor && (
                <div className="mr-modal-doctor">
                  <div className="mr-modal-doctor-avatar">
                    {getInitials(selectedRecord.doctor)}
                  </div>
                  <div>
                    <h4>
                      Dr. {selectedRecord.doctor.user?.first_name}{' '}
                      {selectedRecord.doctor.user?.last_name}
                    </h4>
                    <p>{selectedRecord.doctor.specialization} · {selectedRecord.doctor.hospital}</p>
                  </div>
                </div>
              )}

              {/* Sections */}
              {selectedRecord.symptoms && (
                <ModalSection icon={<Activity size={15} />} title="Symptoms">
                  <p>{selectedRecord.symptoms}</p>
                </ModalSection>
              )}

              {selectedRecord.diagnosis && (
                <ModalSection icon={<FileText size={15} />} title="Diagnosis">
                  <p>{selectedRecord.diagnosis}</p>
                </ModalSection>
              )}

              {selectedRecord.treatment && (
                <ModalSection icon={<Stethoscope size={15} />} title="Treatment Plan">
                  <p>{selectedRecord.treatment}</p>
                </ModalSection>
              )}

              {selectedRecord.prescription && (
                <ModalSection icon={<Pill size={15} />} title="Prescription">
                  <p>{selectedRecord.prescription}</p>
                </ModalSection>
              )}

              {/* Vitals */}
              {(getBpDisplay(selectedRecord) || selectedRecord.vitals?.heart_rate || selectedRecord.vitals?.temperature) && (
                <ModalSection icon={<Heart size={15} />} title="Vitals">
                  <div className="mr-vitals-grid">
                    {getBpDisplay(selectedRecord) && (
                      <div className="mr-vital-box">
                        <Activity size={16} />
                        <span>Blood Pressure</span>
                        <strong>{getBpDisplay(selectedRecord)} mmHg</strong>
                      </div>
                    )}
                    {selectedRecord.vitals?.heart_rate && (
                      <div className="mr-vital-box">
                        <Heart size={16} />
                        <span>Heart Rate</span>
                        <strong>{selectedRecord.vitals.heart_rate} bpm</strong>
                      </div>
                    )}
                    {selectedRecord.vitals?.temperature && (
                      <div className="mr-vital-box">
                        <Thermometer size={16} />
                        <span>Temperature</span>
                        <strong>{selectedRecord.vitals.temperature}°C</strong>
                      </div>
                    )}
                    {selectedRecord.vitals?.weight && (
                      <div className="mr-vital-box">
                        <Droplet size={16} />
                        <span>Weight</span>
                        <strong>{selectedRecord.vitals.weight} kg</strong>
                      </div>
                    )}
                  </div>
                </ModalSection>
              )}

              {selectedRecord.notes && (
                <ModalSection icon={<FileText size={15} />} title="Doctor's Notes">
                  <p className="mr-notes">{selectedRecord.notes}</p>
                </ModalSection>
              )}

              {selectedRecord.follow_up_date && (
                <div className="mr-followup-banner">
                  <Calendar size={16} />
                  <div>
                    <strong>Follow-up Scheduled</strong>
                    <p>{formatDate(selectedRecord.follow_up_date)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mr-modal-footer">
              <button
                className="mr-btn-secondary"
                onClick={() => setSelectedRecord(null)}
              >
                Close
              </button>
              <button className="mr-btn-primary" title="Download (coming soon)">
                <Download size={15} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ModalSection = ({ icon, title, children }) => (
  <div className="mr-modal-section">
    <h4>
      {icon}
      {title}
    </h4>
    {children}
  </div>
);

export default MedicalRecords;