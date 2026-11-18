import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  ArrowLeft, Star, Building2, Briefcase, Languages,
  Stethoscope, BadgeCheck, Award, DollarSign,
} from 'lucide-react';
import './DoctorProfile.css';

const DoctorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [doctor, setDoctor] = useState(null);

  useEffect(() => {
    fetchDoctor();
    // eslint-disable-next-line
  }, [id, user]);

  const fetchDoctor = async () => {
    try {
      setLoading(true);
      setError('');

      // Case 1: URL has :id (patient viewing another doctor)
      if (id) {
        const res = await api.get(`/doctors/${id}/`);
        setDoctor(res.data.data || res.data);
        return;
      }

      // Case 2: Logged-in doctor viewing own profile
      // Try all possible locations for the profile id
      const profileId =
        user?.profile_id ||
        user?.doctor_profile_id ||
        user?.profile?.id ||
        user?.doctor_profile?.id ||
        user?.id;

      if (!profileId) {
        setError('Could not determine your profile ID');
        return;
      }

      const res = await api.get(`/doctors/${profileId}/`);
      setDoctor(res.data.data || res.data);
    } catch (err) {
      console.error('Error loading doctor:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        `Failed to load profile (${err.response?.status || 'network error'})`
      );
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const f = doctor?.user?.first_name?.[0] || '';
    const l = doctor?.user?.last_name?.[0] || '';
    return (f + l).toUpperCase() || 'DR';
  };

  const renderStars = (rating) => {
    const r = parseFloat(rating) || 0;
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        fill={i < Math.round(r) ? '#f59e0b' : 'none'}
        stroke={i < Math.round(r) ? '#f59e0b' : '#cbd5e1'}
      />
    ));
  };

  if (loading) {
    return (
      <div className="dp-loading">
        <div className="spinner" />
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="dp-error">
        <div className="dp-error-icon">⚠️</div>
        <h2>Could not load profile</h2>
        <p>{error || 'Doctor not found'}</p>
        <button className="dp-btn-primary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="doctor-profile-page">
      <button className="dp-back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>

      <div className="dp-hero">
        <div className="dp-hero-bg" />
        <div className="dp-hero-content">
          <div className="dp-hero-avatar">
            {doctor.profile_picture ? (
              <img src={doctor.profile_picture} alt="" />
            ) : (
              <span>{getInitials()}</span>
            )}
          </div>

          <div className="dp-hero-info">
            <div className="dp-hero-name-row">
              <h1>
                Dr. {doctor.user?.first_name} {doctor.user?.last_name}
              </h1>
              {doctor.is_verified && (
                <span className="dp-verified">
                  <BadgeCheck size={18} /> Verified
                </span>
              )}
            </div>

            <div className="dp-hero-spec">
              <Stethoscope size={16} /> {doctor.specialization}
            </div>

            <div className="dp-hero-meta">
              <div className="dp-rating-block">
                <div className="dp-stars">{renderStars(doctor.rating)}</div>
                <span className="dp-rating-number">
                  {parseFloat(doctor.rating || 0).toFixed(1)}
                </span>
                <span className="dp-review-total">
                  ({doctor.total_reviews || 0} reviews)
                </span>
              </div>
              {doctor.hospital && (
                <div className="dp-meta-item">
                  <Building2 size={14} /> {doctor.hospital}
                </div>
              )}
              <div className="dp-meta-item">
                <Briefcase size={14} /> {doctor.years_experience || 0} years
              </div>
              {doctor.languages && (
                <div className="dp-meta-item">
                  <Languages size={14} /> {doctor.languages}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="dp-details-grid">
        <div className="dp-detail-card">
          <h3><Award size={18} /> Professional Info</h3>
          <div className="dp-detail-row">
            <span>License</span>
            <strong>{doctor.license_number || 'N/A'}</strong>
          </div>
          <div className="dp-detail-row">
            <span>Experience</span>
            <strong>{doctor.years_experience || 0} years</strong>
          </div>
          <div className="dp-detail-row">
            <span>Consultation Fee</span>
            <strong>
              ${parseFloat(doctor.consultation_fee || 0).toFixed(2)}
            </strong>
          </div>
          <div className="dp-detail-row">
            <span>Status</span>
            <strong>{doctor.verification_status}</strong>
          </div>
        </div>

        <div className="dp-detail-card">
          <h3><Stethoscope size={18} /> Contact</h3>
          <div className="dp-detail-row">
            <span>Email</span>
            <strong>{doctor.user?.email || 'N/A'}</strong>
          </div>
          <div className="dp-detail-row">
            <span>Username</span>
            <strong>{doctor.user?.username || 'N/A'}</strong>
          </div>
        </div>

        {doctor.bio && (
          <div className="dp-detail-card dp-detail-full">
            <h3>Biography</h3>
            <p>{doctor.bio}</p>
          </div>
        )}

        {doctor.education && (
          <div className="dp-detail-card dp-detail-full">
            <h3>Education</h3>
            <p>{doctor.education}</p>
          </div>
        )}

        {doctor.certifications && (
          <div className="dp-detail-card dp-detail-full">
            <h3>Certifications</h3>
            <p>{doctor.certifications}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorProfile;
