import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  ArrowLeft, Lock, Bell, Globe, Shield, Save, Loader,
  CheckCircle, AlertCircle, Eye, EyeOff, Mail, Smartphone,
  MessageSquare, Moon, Sun, Trash2, Heart, Activity,
} from 'lucide-react';
import './PatientSettings.css';

const PatientSettings = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [activeTab, setActiveTab] = useState('security');

  // Password
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

  // Notifications
  const [notifications, setNotifications] = useState({
    email_appointments: true,
    email_prescriptions: true,
    email_results: true,
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
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState('');

  // Privacy
  const [privacy, setPrivacy] = useState({
    share_data_research: false,
    allow_doctor_reviews: true,
    show_profile_to_doctors: true,
  });
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [privacySuccess, setPrivacySuccess] = useState('');

  // Danger
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/user-preferences/');
        const data = res.data?.data || res.data || {};

        setNotifications((prev) => ({
          ...prev,
          email_appointments: data.email_appointments ?? prev.email_appointments,
          email_prescriptions: data.email_prescriptions ?? prev.email_prescriptions,
          email_results: data.email_results ?? prev.email_results,
          push_appointments: data.push_appointments ?? prev.push_appointments,
          push_messages: data.push_messages ?? prev.push_messages,
          push_reminders: data.push_reminders ?? prev.push_reminders,
          sms_urgent: data.sms_urgent ?? prev.sms_urgent,
        }));

        setPreferences((prev) => ({
          ...prev,
          language: data.language ?? prev.language,
          timezone: data.timezone ?? prev.timezone,
          theme: data.theme ?? prev.theme,
        }));

        setPrivacy((prev) => ({
          ...prev,
          share_data_research: data.share_data_research ?? prev.share_data_research,
          allow_doctor_reviews: data.allow_doctor_reviews ?? prev.allow_doctor_reviews,
          show_profile_to_doctors: data.show_profile_to_doctors ?? prev.show_profile_to_doctors,
        }));
      } catch (err) {
        console.error('Failed to load preferences:', err);
      }
    };
    load();
  }, []);

  const tabs = [
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Globe },
    { id: 'privacy', label: 'Privacy', icon: Heart },
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
        old_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password,
      });

      setPasswordSuccess('Password changed successfully');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
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
  // TOGGLES & SAVES
  // ============================================
  const toggleNotif = (key) =>
    setNotifications((p) => ({ ...p, [key]: !p[key] }));

  const togglePrivacy = (key) =>
    setPrivacy((p) => ({ ...p, [key]: !p[key] }));

    const saveSection = async (setter, successSetter, section) => {
    setter(true);
    successSetter('');
    try {
      let payload = {};

      if (section === 'notifications') {
        payload = notifications;
      } else if (section === 'preferences') {
        payload = preferences;
      } else if (section === 'privacy') {
        payload = privacy;
      }

      await api.patch('/user-preferences/', payload);

      successSetter('Preferences saved');
      toast.success('Settings updated');
      setTimeout(() => successSetter(''), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Failed to save settings');
    } finally {
      setter(false);
    }
  };

  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    logout();
    navigate('/login');
  };

  return (
    <div className="ps-page">
      <div className="ps-header">
        <button className="ps-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>
        <div>
          <h1>Settings</h1>
          <p>Manage your account preferences and privacy</p>
        </div>
      </div>

      <div className="ps-layout">
        <aside className="ps-tabs">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={`ps-tab ${activeTab === t.id ? 'active' : ''} ${t.id === 'danger' ? 'danger' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <Icon size={16} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </aside>

        <main className="ps-content">
          {/* SECURITY */}
          {activeTab === 'security' && (
            <section className="ps-card">
              <div className="ps-card-header">
                <Lock size={18} />
                <div>
                  <h2>Change Password</h2>
                  <p>Keep your account secure</p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="ps-form">
                {passwordError && (
                  <div className="ps-alert error">
                    <AlertCircle size={16} /> {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="ps-alert success">
                    <CheckCircle size={16} /> {passwordSuccess}
                  </div>
                )}

                <div className="ps-field">
                  <label>Current Password</label>
                  <div className="ps-input-wrap">
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
                      className="ps-eye"
                      onClick={() => setShowPasswords((p) => ({ ...p, current: !p.current }))}
                    >
                      {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="ps-field">
                  <label>New Password</label>
                  <div className="ps-input-wrap">
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
                      className="ps-eye"
                      onClick={() => setShowPasswords((p) => ({ ...p, new: !p.new }))}
                    >
                      {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="ps-pw-checks">
                    <span className={passwordForm.new_password.length >= 8 ? 'ok' : ''}>
                      ✓ 8+ characters
                    </span>
                    <span className={/[A-Z]/.test(passwordForm.new_password) ? 'ok' : ''}>
                      ✓ Uppercase
                    </span>
                    <span className={/[0-9]/.test(passwordForm.new_password) ? 'ok' : ''}>
                      ✓ Number
                    </span>
                  </div>
                </div>

                <div className="ps-field">
                  <label>Confirm New Password</label>
                  <div className="ps-input-wrap">
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
                      className="ps-eye"
                      onClick={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))}
                    >
                      {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="ps-btn-primary" disabled={savingPassword}>
                  {savingPassword ? (
                    <><Loader size={16} className="spin" /> Saving...</>
                  ) : (
                    <><Save size={16} /> Update Password</>
                  )}
                </button>
              </form>
            </section>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <section className="ps-card">
              <div className="ps-card-header">
                <Bell size={18} />
                <div>
                  <h2>Notifications</h2>
                  <p>Choose how you want to be notified</p>
                </div>
              </div>

              {notifSuccess && (
                <div className="ps-alert success">
                  <CheckCircle size={16} /> {notifSuccess}
                </div>
              )}

              <div className="ps-notif-group">
                <h4><Mail size={14} /> Email</h4>
                {[
                  { key: 'email_appointments', label: 'Appointment updates', desc: 'Confirmations, reminders, cancellations' },
                  { key: 'email_prescriptions', label: 'Prescriptions', desc: 'New prescriptions from doctors' },
                  { key: 'email_results', label: 'Medical results', desc: 'Lab results and records' },
                ].map((item) => (
                  <div key={item.key} className="ps-toggle-row">
                    <div>
                      <h5>{item.label}</h5>
                      <p>{item.desc}</p>
                    </div>
                    <label className={`ps-switch ${notifications[item.key] ? 'on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={notifications[item.key]}
                        onChange={() => toggleNotif(item.key)}
                      />
                      <span className="ps-switch-knob" />
                    </label>
                  </div>
                ))}
              </div>

              <div className="ps-notif-group">
                <h4><Smartphone size={14} /> Push Notifications</h4>
                {[
                  { key: 'push_appointments', label: 'Appointment reminders', desc: '15 minutes before your appointments' },
                  { key: 'push_messages', label: 'Chat messages', desc: 'New messages from doctors' },
                  { key: 'push_reminders', label: 'Health reminders', desc: 'Medication and follow-up reminders' },
                ].map((item) => (
                  <div key={item.key} className="ps-toggle-row">
                    <div>
                      <h5>{item.label}</h5>
                      <p>{item.desc}</p>
                    </div>
                    <label className={`ps-switch ${notifications[item.key] ? 'on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={notifications[item.key]}
                        onChange={() => toggleNotif(item.key)}
                      />
                      <span className="ps-switch-knob" />
                    </label>
                  </div>
                ))}
              </div>

              <div className="ps-notif-group">
                <h4><MessageSquare size={14} /> SMS</h4>
                <div className="ps-toggle-row">
                  <div>
                    <h5>Urgent alerts</h5>
                    <p>SMS for urgent medical matters only</p>
                  </div>
                  <label className={`ps-switch ${notifications.sms_urgent ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={notifications.sms_urgent}
                      onChange={() => toggleNotif('sms_urgent')}
                    />
                    <span className="ps-switch-knob" />
                  </label>
                </div>
              </div>

              <button
                className="ps-btn-primary"
                onClick={() => saveSection(setSavingNotif, setNotifSuccess, 'notifications')}
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

          {/* PREFERENCES */}
          {activeTab === 'preferences' && (
            <section className="ps-card">
              <div className="ps-card-header">
                <Globe size={18} />
                <div>
                  <h2>Preferences</h2>
                  <p>Customize your app experience</p>
                </div>
              </div>

              {prefsSuccess && (
                <div className="ps-alert success">
                  <CheckCircle size={16} /> {prefsSuccess}
                </div>
              )}

              <div className="ps-field">
                <label>Language</label>
                <select
                  value={preferences.language}
                  onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                >
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="yo">Yoruba</option>
                  <option value="ig">Igbo</option>
                  <option value="ha">Hausa</option>
                </select>
              </div>

              <div className="ps-field">
                <label>Timezone</label>
                <select
                  value={preferences.timezone}
                  onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                >
                  <option value="Africa/Lagos">Africa/Lagos (GMT+1)</option>
                  <option value="Africa/Cairo">Africa/Cairo (GMT+2)</option>
                  <option value="Europe/London">Europe/London (GMT+0)</option>
                  <option value="America/New_York">America/New_York (GMT-5)</option>
                </select>
              </div>

              <div className="ps-field">
                <label>Theme</label>
                <div className="ps-theme-picker">
                  <button
                    className={`ps-theme-opt ${preferences.theme === 'light' ? 'active' : ''}`}
                    onClick={() => setPreferences({ ...preferences, theme: 'light' })}
                  >
                    <Sun size={18} /> Light
                  </button>
                  <button
                    className={`ps-theme-opt ${preferences.theme === 'dark' ? 'active' : ''}`}
                    onClick={() => setPreferences({ ...preferences, theme: 'dark' })}
                  >
                    <Moon size={18} /> Dark
                  </button>
                </div>
              </div>

              <button
                className="ps-btn-primary"
                onClick={() => saveSection(setSavingPrefs, setPrefsSuccess, 'preferences')}
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

          {/* PRIVACY */}
          {activeTab === 'privacy' && (
            <section className="ps-card">
              <div className="ps-card-header">
                <Heart size={18} />
                <div>
                  <h2>Privacy</h2>
                  <p>Control what you share and who can see it</p>
                </div>
              </div>

              {privacySuccess && (
                <div className="ps-alert success">
                  <CheckCircle size={16} /> {privacySuccess}
                </div>
              )}

              {[
                {
                  key: 'show_profile_to_doctors',
                  label: 'Show my profile to doctors',
                  desc: 'Doctors can see your basic info when you book',
                },
                {
                  key: 'allow_doctor_reviews',
                  label: 'Allow doctors to review my case',
                  desc: 'Doctors can see and rate your consultation history',
                },
                {
                  key: 'share_data_research',
                  label: 'Share anonymous data for research',
                  desc: 'Help improve healthcare by sharing anonymized data',
                },
              ].map((item) => (
                <div key={item.key} className="ps-toggle-row">
                  <div>
                    <h5>{item.label}</h5>
                    <p>{item.desc}</p>
                  </div>
                  <label className={`ps-switch ${privacy[item.key] ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={privacy[item.key]}
                      onChange={() => togglePrivacy(item.key)}
                    />
                    <span className="ps-switch-knob" />
                  </label>
                </div>
              ))}

              <button
                className="ps-btn-primary"
                onClick={() => saveSection(setSavingPrivacy, setPrivacySuccess, 'privacy')}
                disabled={savingPrivacy}
              >
                {savingPrivacy ? (
                  <><Loader size={16} className="spin" /> Saving...</>
                ) : (
                  <><Save size={16} /> Save Privacy Settings</>
                )}
              </button>
            </section>
          )}

          {/* DANGER ZONE */}
          {activeTab === 'danger' && (
            <section className="ps-card ps-danger-card">
              <div className="ps-card-header danger">
                <Shield size={18} />
                <div>
                  <h2>Danger Zone</h2>
                  <p>Irreversible actions — proceed with caution</p>
                </div>
              </div>

              <div className="ps-danger-row">
                <div>
                  <h4>Download My Data</h4>
                  <p>Get a copy of all your medical records and personal data.</p>
                </div>
                <button className="ps-btn-warning">Download</button>
              </div>

              <div className="ps-danger-row">
                <div>
                  <h4>Deactivate Account</h4>
                  <p>Temporarily disable your account. Reactivate anytime.</p>
                </div>
                <button className="ps-btn-warning">Deactivate</button>
              </div>

              <div className="ps-danger-row">
                <div>
                  <h4>Delete Account</h4>
                  <p>Permanently delete your account and all health data. This cannot be undone.</p>
                </div>
                <button className="ps-btn-danger" onClick={handleDelete}>
                  <Trash2 size={14} />
                  {showDeleteConfirm ? 'Confirm Delete' : 'Delete'}
                </button>
              </div>

              {showDeleteConfirm && (
                <div className="ps-alert error">
                  <AlertCircle size={16} />
                  <div>
                    <strong>Are you absolutely sure?</strong>
                    <p>This will delete your account and all medical data permanently. Click again to confirm.</p>
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

export default PatientSettings;