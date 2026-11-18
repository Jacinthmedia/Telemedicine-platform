import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

import {
  Search, Filter, Star, MapPin, DollarSign, Clock, Stethoscope,
  Award, Briefcase, Building2, Video, MessageSquare, Calendar,
  X, SlidersHorizontal, Users, CheckCircle, Heart, Bookmark,
  BookmarkCheck, Save, Trash2, TrendingUp, Languages,
} from 'lucide-react';
import './FindDoctors.css';

const FAVORITES_TAB = 'favorites';

const FindDoctors = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [savedSearches, setSavedSearches] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    specialization: '',
    minRating: '',
    maxFee: '',
    availableOnly: false,
    languages: '',
    sortBy: 'rating',
  });

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [savingSearch, setSavingSearch] = useState(false);
  const [toast, setToast] = useState('');

  const specializations = [
    'General Practice', 'Family Medicine', 'Internal Medicine',
    'Pediatrics', 'Cardiology', 'Dermatology', 'Neurology', 'Psychiatry',
    'Obstetrics & Gynecology', 'Orthopedics', 'Ophthalmology', 'ENT',
    'Dentistry', 'Radiology', 'Surgery', 'Urology', 'Oncology',
    'Endocrinology', 'Gastroenterology', 'Pulmonology', 'Nephrology',
  ];

  // ============================================
  // FETCH
  // ============================================
  useEffect(() => {
    fetchDoctors();
    fetchFavorites();
    fetchSavedSearches();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await api.get('/search/doctors/');
      const data = res.data.results || res.data.data || res.data || [];
      setDoctors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching doctors:', err);
      try {
        const res2 = await api.get('/doctors/available/');
        const data2 = res2.data.results || res2.data.data || res2.data || [];
        setDoctors(Array.isArray(data2) ? data2 : []);
      } catch {
        setDoctors([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const res = await api.get('/favorites/');
      const list = res.data.results || res.data.data || res.data || [];
      const arr = Array.isArray(list) ? list : [];
      setFavorites(arr);
      setFavoriteIds(new Set(arr.map((f) => f.doctor)));
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
  };

  const fetchSavedSearches = async () => {
    try {
      const res = await api.get('/saved-searches/');
      const list = res.data.results || res.data.data || res.data || [];
      setSavedSearches(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load saved searches:', err);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // ============================================
  // FAVORITE TOGGLE
  // ============================================
  const toggleFavorite = async (doctorId, e) => {
    if (e) e.stopPropagation();
    const isFav = favoriteIds.has(doctorId);

    // Optimistic
    const next = new Set(favoriteIds);
    if (isFav) next.delete(doctorId);
    else next.add(doctorId);
    setFavoriteIds(next);

    try {
      if (isFav) {
        await api.delete(`/favorites/by-doctor/?doctor=${doctorId}`);
        setFavorites((prev) => prev.filter((f) => f.doctor !== doctorId));
        showToast('Removed from favorites');
      } else {
        await api.post('/favorites/', { doctor: doctorId });
        showToast('Added to favorites ⭐');
        fetchFavorites();
      }
    } catch (err) {
      console.error('Favorite toggle failed:', err);
      // Revert
      const revert = new Set(favoriteIds);
      setFavoriteIds(revert);
      showToast('Failed to update favorite');
    }
  };

  // ============================================
  // SAVE SEARCH
  // ============================================
  const saveCurrentSearch = async () => {
    if (!saveName.trim()) {
      showToast('Please enter a name');
      return;
    }
    setSavingSearch(true);
    try {
      await api.post('/saved-searches/', {
        name: saveName.trim(),
        filters: {
          q: searchQuery,
          ...filters,
        },
      });
      setSaveModalOpen(false);
      setSaveName('');
      showToast('Search saved');
      fetchSavedSearches();
    } catch (err) {
      console.error('Save search failed:', err);
      showToast('Failed to save search');
    } finally {
      setSavingSearch(false);
    }
  };

  const applySavedSearch = (s) => {
    const f = s.filters || {};
    setSearchQuery(f.q || '');
    setFilters({
      specialization: f.specialization || '',
      minRating: f.minRating || '',
      maxFee: f.maxFee || '',
      availableOnly: f.availableOnly || false,
      languages: f.languages || '',
      sortBy: f.sortBy || 'rating',
    });
    setActiveTab('all');
    showToast(`Loaded search "${s.name}"`);
  };

  const deleteSavedSearch = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/saved-searches/${id}/`);
      setSavedSearches((prev) => prev.filter((s) => s.id !== id));
      showToast('Search deleted');
    } catch {
      showToast('Failed to delete');
    }
  };

  // ============================================
  // FILTERS & SORT
  // ============================================
  const filteredDoctors = useMemo(() => {
    let list = [...doctors];

    // Favorites tab
    if (activeTab === FAVORITES_TAB) {
      list = list.filter((d) => favoriteIds.has(d.id));
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((d) => {
        const name = `${d.user?.first_name || ''} ${d.user?.last_name || ''}`.toLowerCase();
        return (
          name.includes(q) ||
          d.specialization?.toLowerCase().includes(q) ||
          d.hospital?.toLowerCase().includes(q)
        );
      });
    }

    // Specialization
    if (filters.specialization) {
      list = list.filter((d) => d.specialization === filters.specialization);
    }

    // Min rating
    if (filters.minRating) {
      list = list.filter(
        (d) => parseFloat(d.rating || 0) >= parseFloat(filters.minRating)
      );
    }

    // Max fee
    if (filters.maxFee) {
      list = list.filter(
        (d) => parseFloat(d.consultation_fee || 0) <= parseFloat(filters.maxFee)
      );
    }

    // Available only
    if (filters.availableOnly) {
      list = list.filter((d) => d.available);
    }

    // Languages
    if (filters.languages.trim()) {
      const lang = filters.languages.toLowerCase();
      list = list.filter((d) => d.languages?.toLowerCase().includes(lang));
    }

    // Sort
    switch (filters.sortBy) {
      case 'rating':
        list.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
        break;
      case 'fee-low':
        list.sort((a, b) => parseFloat(a.consultation_fee || 0) - parseFloat(b.consultation_fee || 0));
        break;
      case 'fee-high':
        list.sort((a, b) => parseFloat(b.consultation_fee || 0) - parseFloat(a.consultation_fee || 0));
        break;
      case 'experience':
        list.sort((a, b) => (b.years_experience || 0) - (a.years_experience || 0));
        break;
      default:
        break;
    }

    return list;
  }, [doctors, activeTab, searchQuery, filters, favoriteIds]);

  const clearFilters = () => {
    setFilters({
      specialization: '',
      minRating: '',
      maxFee: '',
      availableOnly: false,
      languages: '',
      sortBy: 'rating',
    });
    setSearchQuery('');
  };

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.specialization) c++;
    if (filters.minRating) c++;
    if (filters.maxFee) c++;
    if (filters.availableOnly) c++;
    if (filters.languages.trim()) c++;
    return c;
  }, [filters]);

  const getInitials = (doctor) => {
    const f = doctor.user?.first_name?.[0] || '';
    const l = doctor.user?.last_name?.[0] || '';
    return (f + l).toUpperCase() || 'DR';
  };

  const getStarRating = (rating) => {
    const r = parseFloat(rating) || 0;
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        fill={i < Math.round(r) ? '#f59e0b' : 'none'}
        stroke={i < Math.round(r) ? '#f59e0b' : '#cbd5e1'}
      />
    ));
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="find-doctors-page">
      {toast && (
        <div className="fd-toast">
          <CheckCircle size={16} /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="fd-header">
        <div>
          <h1>Find a Doctor</h1>
          <p>Browse verified healthcare professionals</p>
        </div>
        <div className="fd-header-actions">
          <div className="fd-count">
            <Users size={18} />
            <span>
              <strong>{filteredDoctors.length}</strong> doctor{filteredDoctors.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            className="fd-btn-secondary"
            onClick={() => setSaveModalOpen(true)}
            title="Save this search"
          >
            <Bookmark size={15} /> Save
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="fd-tabs">
        <button
          className={`fd-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Stethoscope size={14} /> All Doctors
        </button>
        <button
          className={`fd-tab ${activeTab === FAVORITES_TAB ? 'active' : ''}`}
          onClick={() => setActiveTab(FAVORITES_TAB)}
        >
          <Heart size={14} /> Favorites ({favoriteIds.size})
        </button>

        {savedSearches.length > 0 && (
          <>
            <span className="fd-tabs-divider" />
            {savedSearches.map((s) => (
              <button
                key={s.id}
                className="fd-saved-pill"
                onClick={() => applySavedSearch(s)}
                title="Apply saved search"
              >
                <BookmarkCheck size={13} />
                {s.name}
                <span
                  className="fd-saved-del"
                  onClick={(e) => deleteSavedSearch(s.id, e)}
                  title="Delete"
                >
                  <X size={11} />
                </span>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Search bar */}
      <div className="fd-search-bar">
        <div className="fd-search-input">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by name, specialization, or hospital..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>

        <button
          className={`fd-filter-btn ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters((p) => !p)}
        >
          <SlidersHorizontal size={18} />
          Filters
          {activeFilterCount > 0 && (
            <span className="filter-count">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="fd-filter-panel">
          <div className="fd-filter-group">
            <label>Specialization</label>
            <select
              value={filters.specialization}
              onChange={(e) => setFilters({ ...filters, specialization: e.target.value })}
            >
              <option value="">All Specializations</option>
              {specializations.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="fd-filter-group">
            <label>Min Rating</label>
            <select
              value={filters.minRating}
              onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
            >
              <option value="">Any Rating</option>
              <option value="4.5">4.5+</option>
              <option value="4">4+</option>
              <option value="3">3+</option>
            </select>
          </div>

          <div className="fd-filter-group">
            <label>Max Fee</label>
            <select
              value={filters.maxFee}
              onChange={(e) => setFilters({ ...filters, maxFee: e.target.value })}
            >
              <option value="">Any Price</option>
              <option value="50">Under $50</option>
              <option value="100">Under $100</option>
              <option value="250">Under $250</option>
              <option value="500">Under $500</option>
            </select>
          </div>

          <div className="fd-filter-group">
            <label><Languages size={13} /> Language</label>
            <input
              type="text"
              placeholder="e.g. English, French"
              value={filters.languages}
              onChange={(e) => setFilters({ ...filters, languages: e.target.value })}
            />
          </div>

          <div className="fd-filter-group">
            <label>Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            >
              <option value="rating">Highest Rated</option>
              <option value="experience">Most Experienced</option>
              <option value="fee-low">Lowest Fee</option>
              <option value="fee-high">Highest Fee</option>
            </select>
          </div>

          <div className="fd-filter-checkbox">
            <label>
              <input
                type="checkbox"
                checked={filters.availableOnly}
                onChange={(e) =>
                  setFilters({ ...filters, availableOnly: e.target.checked })
                }
              />
              <span>Available only</span>
            </label>
          </div>

          <button className="fd-clear-btn" onClick={clearFilters}>
            <X size={16} /> Clear All
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="fd-loading">
          <div className="spinner" />
          <p>Loading doctors...</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="fd-empty">
          <div className="fd-empty-icon">
            {activeTab === FAVORITES_TAB ? '💔' : '🔍'}
          </div>
          <h3>
            {activeTab === FAVORITES_TAB
              ? 'No favorites yet'
              : 'No doctors found'}
          </h3>
          <p>
            {activeTab === FAVORITES_TAB
              ? 'Tap the heart on a doctor to save them here.'
              : 'Try adjusting your search or filters.'}
          </p>
          {activeTab === 'all' && (
            <button className="fd-btn-primary" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="fd-grid">
          {filteredDoctors.map((doctor) => {
            const isFav = favoriteIds.has(doctor.id);
            return (
              <div key={doctor.id} className="fd-card">
                {doctor.is_verified && (
                  <div className="fd-verified-badge">
                    <CheckCircle size={14} /> Verified
                  </div>
                )}

                <button
                  className={`fd-fav-btn ${isFav ? 'active' : ''}`}
                  onClick={(e) => toggleFavorite(doctor.id, e)}
                  title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart size={16} fill={isFav ? '#ef4444' : 'none'} />
                </button>

                <div className="fd-card-header">
                  <div className="fd-avatar">
                    {doctor.profile_picture ? (
                      <img src={doctor.profile_picture} alt="" />
                    ) : (
                      <span>{getInitials(doctor)}</span>
                    )}
                    {doctor.available && <span className="fd-online-dot" />}
                  </div>

                  <div className="fd-card-title">
                    <h3>
                      Dr. {doctor.user?.first_name} {doctor.user?.last_name}
                    </h3>
                    <div className="fd-specialization">
                      <Stethoscope size={13} /> {doctor.specialization}
                    </div>
                    <div className="fd-rating">
                      {getStarRating(doctor.rating)}
                      <span className="fd-rating-text">
                        {parseFloat(doctor.rating || 0).toFixed(1)}
                        {doctor.total_reviews > 0 && (
                          <span className="fd-review-count">
                            ({doctor.total_reviews})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="fd-card-details">
                  {doctor.hospital && (
                    <div className="fd-detail">
                      <Building2 size={14} /> <span>{doctor.hospital}</span>
                    </div>
                  )}
                  <div className="fd-detail">
                    <Briefcase size={14} /> <span>{doctor.years_experience || 0} years experience</span>
                  </div>
                  {doctor.languages && (
                    <div className="fd-detail">
                      <Languages size={14} /> <span>{doctor.languages}</span>
                    </div>
                  )}
                </div>

                <div className="fd-card-fee">
                  <div className="fd-fee-label">Consultation Fee</div>
                  <div className="fd-fee-amount">
                    ${parseFloat(doctor.consultation_fee || 0).toFixed(2)}
                  </div>
                </div>

                <div className="fd-availability">
                  {doctor.available ? (
                    <span className="fd-status available">
                      <span className="dot" /> Available Now
                    </span>
                  ) : (
                    <span className="fd-status busy">
                      <span className="dot" /> Unavailable
                    </span>
                  )}
                </div>

                <div className="fd-card-actions">
                  <button
                    className="fd-btn-secondary"
                    onClick={() => navigate(`/patient/doctors/${doctor.id}`)}
                  >
                    View Profile
                  </button>
                  <button
                    className="fd-btn-primary"
                    disabled={!doctor.available}
                    onClick={() => navigate(`/appointments/book?doctor=${doctor.id}`)}
                  >
                    <Calendar size={16} /> Book Now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save search modal */}
      {saveModalOpen && (
        <div className="fd-modal-backdrop" onClick={() => setSaveModalOpen(false)}>
          <div className="fd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fd-modal-header">
              <Bookmark size={20} />
              <h3>Save This Search</h3>
              <button className="fd-modal-close" onClick={() => setSaveModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="fd-modal-body">
              <p>Give this search a name so you can quickly apply it later.</p>
              <div className="fd-filter-group">
                <label>Search Name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="e.g. Cardiologists under $200"
                  autoFocus
                />
              </div>

              <div className="fd-save-preview">
                <strong>Current filters:</strong>
                <span>Search: {searchQuery || '—'}</span>
                <span>Specialization: {filters.specialization || 'Any'}</span>
                <span>Rating: {filters.minRating || 'Any'}</span>
                <span>Fee: {filters.maxFee ? `Under $${filters.maxFee}` : 'Any'}</span>
                <span>Sort: {filters.sortBy}</span>
              </div>
            </div>
            <div className="fd-modal-footer">
              <button className="fd-btn-secondary" onClick={() => setSaveModalOpen(false)}>
                Cancel
              </button>
              <button
                className="fd-btn-primary"
                onClick={saveCurrentSearch}
                disabled={savingSearch || !saveName.trim()}
              >
                <Save size={15} /> {savingSearch ? 'Saving...' : 'Save Search'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindDoctors;