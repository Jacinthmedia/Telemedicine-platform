import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { Settings, Shield, Bell, Globe, Save, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import './AdminSettings.css';

const AdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('preferences');
  const [preferences, setPreferences] = useState({ language: 'en', timezone: 'Africa/Lagos', currency: 'NGN', theme: 'light' });
  const [notifications, setNotifications] = useState({ email_appointments: true, email_prescriptions: true, email_results: true, email_payments: true, push_appointments: true, push_messages: true, push_reminders: true, sms_urgent: false });
  const tabs = [ { id: 'preferences', label: 'Preferences', icon: Globe }, { id: 'notifications', label: 'Notifications', icon: Bell }, { id: 'security', label: 'Security', icon: Shield } ];

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/user-preferences/');
        const data = res.data?.data || res.data || {};
        setPreferences((p) => ({ ...p, ...data }));
        setNotifications((n) => ({ ...n, ...data }));
      } catch (err) {
        console.error('Load prefs failed:', err);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = activeTab === 'notifications' ? notifications : preferences;
      await api.patch('/user-preferences/', payload);
      toast.success('Settings updated');
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className='as-loading'><Loader className='spin' size={32} /></div>;

  return (
    <div className='as-page'>
      <div className='as-header'><div><h1><Settings size={28} /> Admin Settings</h1><p>Manage your platform preferences</p></div></div>
      <div className='as-layout'>
        <aside className='as-tabs'>
          {tabs.map((t) => {
            const Icon = t.icon;
            return <button key={t.id} className={'as-tab ' + (activeTab === t.id ? 'active' : '')} onClick={() => setActiveTab(t.id)}><Icon size={16} />{t.label}</button>;
          })}
        </aside>
        <main className='as-content'>
          {activeTab === 'preferences' && (
            <section className='as-card'>
              <h2>Preferences</h2>
              <div className='as-field'><label>Language</label><select value={preferences.language} onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}><option value='en'>English</option><option value='fr'>French</option><option value='yo'>Yoruba</option><option value='ig'>Igbo</option><option value='ha'>Hausa</option></select></div>
              <div className='as-field'><label>Timezone</label><input type='text' value={preferences.timezone} onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })} /></div>
              <div className='as-field'><label>Currency</label><select value={preferences.currency} onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}><option value='NGN'>NGN</option><option value='USD'>USD</option><option value='EUR'>EUR</option><option value='GBP'>GBP</option></select></div>
              <div className='as-field'><label>Theme</label><select value={preferences.theme} onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}><option value='light'>Light</option><option value='dark'>Dark</option><option value='system'>System</option></select></div>
            </section>
          )}
          {activeTab === 'notifications' && (
            <section className='as-card'>
              <h2>Notifications</h2>
              {[['email_appointments', 'Email: Appointments'],['email_prescriptions', 'Email: Prescriptions'],['email_results', 'Email: Results'],['email_payments', 'Email: Payments'],['push_appointments', 'Push: Appointments'],['push_messages', 'Push: Messages'],['push_reminders', 'Push: Reminders'],['sms_urgent', 'SMS: Urgent only']].map(([key, label]) => (
                <div key={key} className='as-toggle-row'>
                  <label>{label}</label>
                </div>
              ))}
            </section>
          )}
          {activeTab === 'security' && (
            <section className='as-card'>
              <h2>Security</h2>
              <div className='as-info'><CheckCircle size={16} /> Two-factor authentication (coming soon)</div>
              <div className='as-info'><CheckCircle size={16} /> All traffic encrypted over HTTPS</div>
              <div className='as-info'><AlertCircle size={16} /> Contact system administrator for critical changes</div>
            </section>
          )}
          <div className='as-actions'>
            <button className='as-btn' onClick={handleSave} disabled={saving}>{saving ? <><Loader size={16} className='spin' /> Saving...</> : <><Save size={16} /> Save Changes</>}</button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminSettings;
