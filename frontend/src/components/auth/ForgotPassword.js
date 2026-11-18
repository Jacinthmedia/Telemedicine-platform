import React, { useState } from 'react';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Shield, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post('/auth/verify-email/', { email });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Email not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post('/auth/reset-password/', { email, newPassword });
      toast.success('Password reset successful!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error resetting password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="auth-card apple-card"
      >
        <div className="auth-header">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="auth-icon"
          >
            🔐
          </motion.span>
          <h2>{step === 1 ? 'Forgot Password' : 'Reset Password'}</h2>
          <p>{step === 1 ? 'Enter your email to verify your account.' : 'Choose a strong new password.'}</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="login-error"
            >
              <AlertCircle size={20} className="error-icon" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {step === 1 ? (
          <form onSubmit={handleVerifyEmail}>
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className="apple-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn-primary apple-btn login-btn" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Verify Email'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label>New Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  className="apple-input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength="6"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary apple-btn login-btn" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>
            <button 
              onClick={() => navigate('/login')} 
              style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', width: '100%', fontWeight: '600' }}
            >
              <ArrowLeft size={16} /> Back to Login
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;