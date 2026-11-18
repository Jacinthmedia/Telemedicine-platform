import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  ArrowLeft, Lock, Bell, Globe, Shield, Save, Loader,
  CheckCircle, AlertCircle, Eye, EyeOff, Mail, Smartphone,
  MessageSquare, Calendar, DollarSign, Moon, Sun, Trash2,
} from 'lucide-react';
import './DoctorSettings.css';

const DoctorSettings = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [activeTab, setActiveTab] = useState('security');

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Notification prefs
  const [notifications, setNotifications] = useState({
    email_appointments: true,
    email_prescriptions: true,
    email_payments: true,
    push_appointments: true,
    push_messages: true,
    push_reminders: true,
    sms_urgent: false,
  });
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState('');

  // Preferences
  const [preferences, setPreferences] = useState({
    language: 'en',
    timezone: 'Africa/Lagos',
    theme: 'light',
    currency: 'NGN',
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState('');

  // Danger zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const tabs = [
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'preferences', label: 'Preferences', icon: Globe },
  { id: 'danger', label: 'Danger Zone', icon: Shield },
];

  // ============================================
  // PASSWORD
  // ============================================
  const validatePassword = () => {
    if (!passwordForm.current_password) return 'Current password is required';
    if (passwordForm.new_password.length < 8) return 'New password must be at least 8 characters';
    if (!/[A-Z]/.test(passwordForm.new_password)) return 'Must contain an uppercase letter';
    if (!/[0-9]/.test(passwordForm.new_password)) return 'Must contain a number';
    if (passwordForm.new_password !== passwordForm.confirm_password) return 'Passwords do not match';
    return '';
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const err = validatePassword();
    if (err) {
      setPasswordError(err);
      return;
    }

    setSavingPassword(true);
    try {
      await api.post('/auth/change-password/', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });

      setPasswordSuccess('Password changed successfully');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (error) {
      setPasswordError(
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to change password'
      );
    } finally {
      setSavingPassword(false);
    }
  };

  // ============================================
  // NOTIFICATIONS
  // ============================================
  const handleNotifToggle = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNotifSave = async () => {
    setSavingNotif(true);
    setNotifSuccess('');
    try {
      // Placeholder — no backend endpoint yet
      await new Promise((r) => setTimeout(r, 600));
      setNotifSuccess('Notification preferences saved');
      setTimeout(() => setNotifSuccess(''), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setSavingNotif(false);
    }
  };

  // ============================================
  // PREFERENCES
  // ============================================
  const handlePrefsSave = async () => {
    setSavingPrefs(true);
    setPrefsSuccess('');
    try {
      await new Promise((r) => setTimeout(r, 600));
      setPrefsSuccess('Preferences saved');
      setTimeout(() => setPrefsSuccess(''), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setSavingPrefs(false);
    }
  };

  // ============================================
  // DELETE ACCOUNT
  // ============================================
  const handleDeleteAccount = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    // In production: call delete endpoint
    logout();
    navigate('/login');
  };

  return (
    <div className="ds-page">
      <div className="ds-header">
        <button className="ds-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>
        <div>
          <h1>Settings</h1>
          <p>Manage your account preferences and security</p>
        </div>
      </div>

      <div className="ds-layout">
        {/* Sidebar tabs */}
        <aside className="ds-tabs">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={`ds-tab ${activeTab === t.id ? 'active' : ''} ${t.id === 'danger' ? 'danger' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <Icon size={16} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Content */}
        <main className="ds-content">
          {/* ================= SECURITY ================= */}
          {activeTab === 'security' && (
            <section className="ds-card">
              <div className="ds-card-header">
                <Lock size={18} />
                <div>
                  <h2>Change Password</h2>
                  <p>Keep your account secure with a strong password</p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="ds-form">
                {passwordError && (
                  <div className="ds-alert error">
                    <AlertCircle size={16} /> {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="ds-alert success">
                    <CheckCircle size={16} /> {passwordSuccess}
                  </div>
                )}

                <div className="ds-field">
                  <label>Current Password</label>
                  <div className="ds-input-wrap">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.current_password}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, current_password: e.target.value })
                      }
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      className="ds-eye"
                      onClick={() =>
                        setShowPasswords((p) => ({ ...p, current: !p.current }))
                      }
                    >
                      {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="ds-field">
                  <label>New Password</label>
                  <div className="ds-input-wrap">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.new_password}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, new_password: e.target.value })
                      }
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                    />
                    <button
                      type="button"
                      className="ds-eye"
                      onClick={() => setShowPasswords((p) => ({ ...p, new: !p.new }))}
                    >
                      {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="ds-pw-checks">
                    <span className={passwordForm.new_password.length >= 8 ? 'ok' : ''}>
                      ✓ 8+ characters
                    </span>
                    <span className={/[A-Z]/.test(passwordForm.new_password) ? 'ok' : ''}>
                      ✓ Uppercase letter
                    </span>
                    <span className={/[0-9]/.test(passwordForm.new_password) ? 'ok' : ''}>
                      ✓ Number
                    </span>
                  </div>
                </div>

                <div className="ds-field">
                  <label>Confirm New Password</label>
                  <div className="ds-input-wrap">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirm_password}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                      }
                      placeholder="Re-enter new password"
                    />
                    <button
                      type="button"
                      className="ds-eye"
                      onClick={() =>
                        setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))
                      }
                    >
                      {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="ds-btn-primary" disabled={savingPassword}>
                  {savingPassword ? (
                    <><Loader size={16} className="spin" /> Saving...</>
                  ) : (
                    <><Save size={16} /> Update Password</>
                  )}
                </button>
              </form>
            </section>
          )}

          {/* ================= NOTIFICATIONS ================= */}
          {activeTab === 'notifications' && (
            <section className="ds-card">
              <div className="ds-card-header">
                <Bell size={18} />
                <div>
                  <h2>Notification Preferences</h2>
                  <p>Choose how you want to be notified</p>
                </div>
              </div>

              {notifSuccess && (
                <div className="ds-alert success">
                  <CheckCircle size={16} /> {notifSuccess}
                </div>
              )}

              <div className="ds-notif-group">
                <h4><Mail size={14} /> Email Notifications</h4>
                {[
                  { key: 'email_appointments', label: 'Appointment updates', desc: 'Confirmations, cancellations, reminders' },
                  { key: 'email_prescriptions', label: 'New prescriptions', desc: 'When a prescription is issued' },
                  { key: 'email_payments', label: 'Payment receipts', desc: 'When payments are processed' },
                ].map((item) => (
                  <div key={item.key} className="ds-toggle-row">
                    <div>
                      <h5>{item.label}</h5>
                      <p>{item.desc}</p>
                    </div>
                    <label className={`ds-switch ${notifications[item.key] ? 'on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={notifications[item.key]}
                        onChange={() => handleNotifToggle(item.key)}
                      />
                      <span className="ds-switch-knob" />
                    </label>
                  </div>
                ))}
              </div>

              <div className="ds-notif-group">
                <h4><Smartphone size={14} /> Push Notifications</h4>
                {[
                  { key: 'push_appointments', label: 'Appointment reminders', desc: '15 min before appointments' },
                  { key: 'push_messages', label: 'New messages', desc: 'Patient chat messages' },
                  { key: 'push_reminders', label: 'Schedule reminders', desc: 'Daily summary of upcoming appointments' },
                ].map((item) => (
                  <div key={item.key} className="ds-toggle-row">
                    <div>
                      <h5>{item.label}</h5>
                      <p>{item.desc}</p>
                    </div>
                    <label className={`ds-switch ${notifications[item.key] ? 'on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={notifications[item.key]}
                        onChange={() => handleNotifToggle(item.key)}
                      />
                      <span className="ds-switch-knob" />
                    </label>
                  </div>
                ))}
              </div>

              <div className="ds-notif-group">
                <h4><MessageSquare size={14} /> SMS</h4>
                <div className="ds-toggle-row">
                  <div>
                    <h5>Urgent alerts only</h5>
                    <p>SMS notifications for urgent matters</p>
                  </div>
                  <label className={`ds-switch ${notifications.sms_urgent ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={notifications.sms_urgent}
                      onChange={() => handleNotifToggle('sms_urgent')}
                    />
                    <span className="ds-switch-knob" />
                  </label>
                </div>
              </div>

              <button
                className="ds-btn-primary"
                onClick={handleNotifSave}
                disabled={savingNotif}
              >
                {savingNotif ? (
                  <><Loader size={16} className="spin" /> Saving...</>
                ) : (
                  <><Save size={16} /> Save Preferences</>
                )}
              </button>
            </section>
          )}

          {/* ================= PREFERENCES ================= */}
          {activeTab === 'preferences' && (
            <section className="ds-card">
              <div className="ds-card-header">
                <Globe size={18} />
                <div>
                  <h2>App Preferences</h2>
                  <p>Customize how the app looks and behaves</p>
                </div>
              </div>

              {prefsSuccess && (
                <div className="ds-alert success">
                  <CheckCircle size={16} /> {prefsSuccess}
                </div>
              )}

              <div className="ds-field">
                <label>Language</label>
                <select
                  value={preferences.language}
                  onChange={(e) =>
                    setPreferences({ ...preferences, language: e.target.value })
                  }
                >
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="yo">Yoruba</option>
                  <option value="ig">Igbo</option>
                  <option value="ha">Hausa</option>
                </select>
              </div>

              <div className="ds-field">
                <label>Timezone</label>
                <select
                  value={preferences.timezone}
                  onChange={(e) =>
                    setPreferences({ ...preferences, timezone: e.target.value })
                  }
                >
                  <option value="Africa/Lagos">Africa/Lagos (GMT+1)</option>
                  <option value="Africa/Cairo">Africa/Cairo (GMT+2)</option>
                  <option value="Europe/London">Europe/London (GMT+0)</option>
                  <option value="America/New_York">America/New_York (GMT-5)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                </select>
              </div>

              <div className="ds-field">
                <label>Currency</label>
                <select
                  value={preferences.currency}
                  onChange={(e) =>
                    setPreferences({ ...preferences, currency: e.target.value })
                  }
                >
                  <option value="NGN">Nigerian Naira (₦)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="GBP">British Pound (£)</option>
                </select>
              </div>

              <div className="ds-field">
                <label>Theme</label>
                <div className="ds-theme-picker">
                  <button
                    className={`ds-theme-opt ${preferences.theme === 'light' ? 'active' : ''}`}
                    onClick={() => setPreferences({ ...preferences, theme: 'light' })}
                  >
                    <Sun size={18} /> Light
                  </button>
                  <button
                    className={`ds-theme-opt ${preferences.theme === 'dark' ? 'active' : ''}`}
                    onClick={() => setPreferences({ ...preferences, theme: 'dark' })}
                  >
                    <Moon size={18} /> Dark
                  </button>
                </div>
              </div>

              <button
                className="ds-btn-primary"
                onClick={handlePrefsSave}
                disabled={savingPrefs}
              >
                {savingPrefs ? (
                  <><Loader size={16} className="spin" /> Saving...</>
                ) : (
                  <><Save size={16} /> Save Preferences</>
                )}
              </button>
            </section>
          )}

          {/* ================= DANGER ZONE ================= */}
          {activeTab === 'danger' && (
            <section className="ds-card ds-danger-card">
              <div className="ds-card-header danger">
                <Shield size={18} />
                <div>
                  <h2>Danger Zone</h2>
                  <p>Irreversible actions — proceed with caution</p>
                </div>
              </div>

              <div className="ds-danger-row">
                <div>
                  <h4>Deactivate Account</h4>
                  <p>Temporarily disable your account. You can reactivate anytime.</p>
                </div>
                <button className="ds-btn-warning">Deactivate</button>
              </div>

              <div className="ds-danger-row">
                <div>
                  <h4>Delete Account</h4>
                  <p>
                    Permanently delete your account and all associated data.
                    This action cannot be undone.
                  </p>
                </div>
                <button className="ds-btn-danger" onClick={handleDeleteAccount}>
                  <Trash2 size={14} />
                  {showDeleteConfirm ? 'Confirm Delete' : 'Delete'}
                </button>
              </div>

              {showDeleteConfirm && (
                <div className="ds-alert error">
                  <AlertCircle size={16} />
                  <div>
                    <strong>Are you sure?</strong>
                    <p>
                      This will permanently delete your account.
                      Click "Confirm Delete" again to proceed, or refresh the page to cancel.
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default DoctorSettings;