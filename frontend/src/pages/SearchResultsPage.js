
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  Search,
  X,
  Loader,
  Calendar,
  User,
  Stethoscope,
  Star,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import './SearchResultsPage.css';


const SearchResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(query);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [results, setResults] = useState({
    doctors: [],
    patients: [],
    appointments: [],
  });
  const [activeTab, setActiveTab] = useState('all');

  // ============================================
  // SEARCH
  // ============================================
  useEffect(() => {
    setInputValue(query);
    if (query.trim()) {
      runSearch(query);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line
  }, [query]);

  const runSearch = async (q) => {
    try {
      setLoading(true);
      setError('');

      // Use the global search endpoint
      const res = await api.get('/search/', { params: { q } });
      const data = res.data.data || res.data || {};

      setResults({
        doctors: Array.isArray(data.doctors) ? data.doctors : [],
        patients: Array.isArray(data.patients) ? data.patients : [],
        appointments: Array.isArray(data.appointments) ? data.appointments : [],
      });
    } catch (err) {
      // Fallback: search doctors publicly if global search fails
      try {
        const docRes = await api.get('/search/doctors/', {
          params: { search: q },
        });
        const docs = docRes.data.results || docRes.data.data || docRes.data || [];
        setResults({
          doctors: Array.isArray(docs) ? docs : [],
          patients: [],
          appointments: [],
        });
      } catch (err2) {
        console.error('Search failed:', err2);
        setError(
          err.response?.data?.message ||
          err.response?.data?.detail ||
          'Search failed'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setSearchParams({ q: inputValue.trim() });
    }
  };

  // ============================================
  // TOTALS
  // ============================================
  const totals = useMemo(() => ({
    all: results.doctors.length + results.patients.length + results.appointments.length,
    doctors: results.doctors.length,
    patients: results.patients.length,
    appointments: results.appointments.length,
  }), [results]);

  // ============================================
  // HELPERS
  // ============================================
  const getInitials = (obj) => {
    const f = obj?.user?.first_name?.[0] || obj?.first_name?.[0] || '';
    const l = obj?.user?.last_name?.[0] || obj?.last_name?.[0] || '';
    return (f + l).toUpperCase() || 'U';
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const renderStars = (rating) => {
    const r = parseFloat(rating) || 0;
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={13}
        fill={i < Math.round(r) ? '#f59e0b' : 'none'}
        stroke={i < Math.round(r) ? '#f59e0b' : '#cbd5e1'}
      />
    ));
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="sr-page">
      {/* Search bar */}
      <form className="sr-search-bar" onSubmit={handleSubmit}>
        <Search size={20} />
        <input
          type="text"
          placeholder="Search doctors, patients, appointments..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          autoFocus
        />
        {inputValue && (
          <button
            type="button"
            className="sr-clear"
            onClick={() => {
              setInputValue('');
              setSearchParams({});
            }}
          >
            <X size={16} />
          </button>
        )}
        <button type="submit" className="sr-search-btn">Search</button>
      </form>

      {/* No query */}
      {!query.trim() ? (
        <div className="sr-empty">
          <Search size={56} />
          <h3>Start typing to search</h3>
          <p>Search doctors, patients, or appointments</p>
        </div>
      ) : loading ? (
        <div className="sr-loading">
          <Loader size={32} className="spin" />
          <p>Searching for "{query}"...</p>
        </div>
      ) : error ? (
        <div className="sr-error">
          <AlertCircle size={32} />
          <h3>Search failed</h3>
          <p>{error}</p>
        </div>
      ) : totals.all === 0 ? (
        <div className="sr-empty">
          <Search size={56} />
          <h3>No results for "{query}"</h3>
          <p>Try a different keyword or check your spelling</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="sr-tabs">
            {[
              { id: 'all', label: 'All', count: totals.all, icon: Search },
              { id: 'doctors', label: 'Doctors', count: totals.doctors, icon: Stethoscope },
              { id: 'patients', label: 'Patients', count: totals.patients, icon: User },
              { id: 'appointments', label: 'Appointments', count: totals.appointments, icon: Calendar },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  className={`sr-tab ${activeTab === t.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                  disabled={t.count === 0 && t.id !== 'all'}
                >
                  <Icon size={15} />
                  {t.label}
                  <span className="sr-tab-count">{t.count}</span>
                </button>
              );
            })}
          </div>

          {/* Results summary */}
          <div className="sr-summary">
            Found <strong>{totals.all}</strong> result{totals.all !== 1 ? 's' : ''} for "<strong>{query}</strong>"
          </div>

          <div className="sr-results">
            {/* ============== DOCTORS ============== */}
            {(activeTab === 'all' || activeTab === 'doctors') && results.doctors.length > 0 && (
              <section className="sr-section">
                <div className="sr-section-header">
                  <h2><Stethoscope size={18} /> Doctors ({results.doctors.length})</h2>
                </div>

                <div className="sr-doctor-grid">
                  {results.doctors.map((doc) => (
                    <div
                      key={doc.id}
                      className="sr-doctor-card"
                      onClick={() => navigate(`/patient/doctors/${doc.id}`)}
                    >
                      <div className="sr-avatar green">
                        {getInitials(doc)}
                      </div>
                      <div className="sr-doctor-info">
                        <h4>
                          Dr. {doc.user?.first_name} {doc.user?.last_name}
                        </h4>
                        <p className="sr-spec">
                          <Stethoscope size={12} /> {doc.specialization}
                        </p>
                        <div className="sr-meta">
                          <span className="sr-rating">
                            {renderStars(doc.rating)}
                            <strong>{parseFloat(doc.rating || 0).toFixed(1)}</strong>
                          </span>
                          <span className="sr-fee">${parseFloat(doc.consultation_fee || 0).toFixed(0)}</span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="sr-arrow" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ============== PATIENTS ============== */}
            {(activeTab === 'all' || activeTab === 'patients') && results.patients.length > 0 && (
              <section className="sr-section">
                <div className="sr-section-header">
                  <h2><User size={18} /> Patients ({results.patients.length})</h2>
                </div>

                <div className="sr-item-list">
                  {results.patients.map((p) => (
                    <div key={p.id} className="sr-item">
                      <div className="sr-avatar blue">
                        {getInitials(p)}
                      </div>
                      <div className="sr-item-info">
                        <h4>
                          {p.user?.first_name} {p.user?.last_name}
                        </h4>
                        <p>
                          @{p.user?.username}
                          {p.user?.email && ` · ${p.user.email}`}
                        </p>
                        {p.phone && (
                          <span className="sr-phone">{p.phone}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ============== APPOINTMENTS ============== */}
            {(activeTab === 'all' || activeTab === 'appointments') && results.appointments.length > 0 && (
              <section className="sr-section">
                <div className="sr-section-header">
                  <h2><Calendar size={18} /> Appointments ({results.appointments.length})</h2>
                </div>

                <div className="sr-item-list">
                  {results.appointments.map((a) => (
                    <div
                      key={a.id}
                      className="sr-item clickable"
                      onClick={() => navigate('/appointments')}
                    >
                      <div className={`sr-avatar ${
                        a.consultation_type === 'audio' ? 'amber' :
                        a.consultation_type === 'chat' ? 'purple' : 'teal'
                      }`}>
                        <Calendar size={16} />
                      </div>
                      <div className="sr-item-info">
                        <h4>
                          {a.patient?.user?.first_name || 'Unknown'} → Dr.{' '}
                          {a.doctor?.user?.last_name || 'Unknown'}
                        </h4>
                        <p>
                          {formatDate(a.appointment_date)} at {a.start_time?.slice(0, 5)}
                        </p>
                        <div className="sr-item-badges">
                          <span className={`sr-badge status-${a.status}`}>
                            {a.status}
                          </span>
                          {a.consultation_type && (
                            <span className={`sr-badge type-${a.consultation_type}`}>
                              {a.consultation_type}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={18} className="sr-arrow" />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SearchResultsPage;