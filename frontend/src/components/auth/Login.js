import React, { useState, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight, Shield } from 'lucide-react';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const redirectMessage = location.state?.message;

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await login(username, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Login failed.');
    }
    setLoading(false);
  }, [username, password, login, navigate]);

  return (
    <div className="auth-container">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="auth-card login-card apple-card">
        <div className="auth-header">
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="auth-icon">🏥</motion.span>
          <h2>Welcome Back</h2>
          <p>Sign in to your account</p>
        </div>
        
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="login-error">
              <AlertCircle size={20} className="error-icon" />
              <span>{error}</span>
            </motion.div>
          )}
          {redirectMessage && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="success-message-banner">
              <CheckCircle size={20} />
              <span>{redirectMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input type="text" className="apple-input" value={username} onChange={(e) => { setUsername(e.target.value); if(error) setError(''); }} placeholder="Enter your username" autoFocus />
            </div>
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input type={showPassword ? 'text' : 'password'} className="apple-input" value={password} onChange={(e) => { setPassword(e.target.value); if(error) setError(''); }} placeholder="Enter your password" />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <div className="login-options">
            <label className="checkbox-label">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              <span>Remember me</span>
            </label>
            <button type="button" className="forgot-password" onClick={() => { localStorage.clear(); window.location.href = '/forgot-password'; }}>
              Forgot Password?
            </button>
          </div>
          
          <button type="submit" className="btn-primary apple-btn login-btn" disabled={loading}>
            {loading ? <><span className="spinner"></span> Logging in...</> : <>Sign In <ArrowRight size={18} /></>}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register">Sign Up</Link></p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
