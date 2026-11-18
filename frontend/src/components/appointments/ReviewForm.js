import React, { useState } from 'react';
import api from '../../api/axios';
import {
  Star, X, CheckCircle, AlertCircle, Loader, MessageSquare,
} from 'lucide-react';
import './ReviewForm.css';

const ReviewForm = ({ appointment, doctor, onClose, onSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/reviews/', {
        appointment: appointment.id,
        rating,
        comment: comment.trim(),
        is_anonymous: isAnonymous,
      });
      setSuccess(true);
      setTimeout(() => {
        if (onSubmitted) onSubmitted();
      }, 1500);
    } catch (err) {
      const data = err.response?.data;
      let msg = 'Failed to submit review';
      if (data) {
        if (typeof data === 'string') msg = data;
        else if (Array.isArray(data)) msg = data[0];
        else if (data.error) msg = data.error;
        else if (data.detail) msg = data.detail;
        else {
          const firstKey = Object.keys(data)[0];
          if (firstKey) msg = `${firstKey}: ${data[firstKey][0] || data[firstKey]}`;
        }
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (usr) => {
    const f = usr?.first_name?.[0] || '';
    const l = usr?.last_name?.[0] || '';
    return (f + l).toUpperCase() || 'DR';
  };

  return (
    <div className="rv-backdrop" onClick={onClose}>
      <div className="rv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rv-header">
          <h2>Leave a Review</h2>
          <button className="rv-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="rv-success">
            <CheckCircle size={56} />
            <h3>Thank you!</h3>
            <p>Your review has been submitted.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="rv-body">
            {/* Doctor card */}
            <div className="rv-doctor-card">
              <div className="rv-doctor-avatar">
                {doctor?.profile_picture ? (
                  <img src={doctor.profile_picture} alt="" />
                ) : (
                  getInitials(doctor?.user)
                )}
              </div>
              <div>
                <h4>
                  Dr. {doctor?.user?.first_name} {doctor?.user?.last_name}
                </h4>
                <p>{doctor?.specialization}</p>
              </div>
            </div>

            {error && (
              <div className="rv-alert error">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Rating */}
            <div className="rv-section">
              <label>How was your experience?</label>
              <div className="rv-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="rv-star"
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(n)}
                  >
                    <Star
                      size={36}
                      fill={(hovered || rating) >= n ? '#f59e0b' : 'none'}
                      stroke={(hovered || rating) >= n ? '#f59e0b' : '#cbd5e1'}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <span className="rv-rating-label">
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                </span>
              )}
            </div>

            {/* Comment */}
            <div className="rv-section">
              <label>
                <MessageSquare size={14} /> Comment (optional)
              </label>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share details about your consultation..."
                maxLength={500}
              />
              <span className="rv-counter">{comment.length}/500</span>
            </div>

            {/* Anonymous */}
            <label className="rv-checkbox">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              <span>Post as anonymous</span>
            </label>

            {/* Submit */}
            <div className="rv-actions">
              <button
                type="button"
                className="rv-btn secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rv-btn primary"
                disabled={submitting || rating === 0}
              >
                {submitting ? (
                  <><Loader size={16} className="spin" /> Submitting...</>
                ) : (
                  <><CheckCircle size={16} /> Submit Review</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReviewForm;