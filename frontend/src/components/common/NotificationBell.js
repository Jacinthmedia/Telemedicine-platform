import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  Bell, Check, CheckCheck, X, Calendar, MessageSquare, Pill,
  CreditCard, FileText, Shield, UserCheck, Info, Loader,
} from 'lucide-react';
import './NotificationBell.css';

const NotificationBell = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dropdownRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ============================================
  // FETCH
  // ============================================
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications/');
      const list = res.data.results || res.data.data || res.data || [];
      const arr = Array.isArray(list) ? list : [];
      setNotifications(arr.slice(0, 20));
      setUnreadCount(arr.filter((n) => !n.is_read).length);
    } catch (err) {
      console.error('Notifications fetch failed:', err);
    }
  };

  // ============================================
  // ACTIONS
  // ============================================
  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/mark-read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Mark read failed:', err);
    }
  };

  const markAllRead = async () => {
    setLoading(true);
    try {
      await api.post('/notifications/mark-all-read/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all read failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.is_read) markAsRead(n.id);
    setOpen(false);
    if (n.link) {
      navigate(n.link);
    } else {
      // Route based on type
      const routes = {
        appointment: '/appointments',
        medical_record: '/medical-records',
        prescription: '/prescriptions',
        payment: '/payments',
        message: '/chat',
        doctor_verification: '/admin/doctor-verification',
      };
      const path = routes[n.notification_type];
      if (path) navigate(path);
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const getIcon = (type) => {
    const icons = {
      appointment: Calendar,
      medical_record: FileText,
      prescription: Pill,
      payment: CreditCard,
      message: MessageSquare,
      review: UserCheck,
      document: FileText,
      doctor_verification: UserCheck,
      security: Shield,
      system: Info,
    };
    return icons[type] || Info;
  };

  const getIconColor = (type) => {
    const colors = {
      appointment: '#3b82f6',
      medical_record: '#8b5cf6',
      prescription: '#f59e0b',
      payment: '#10b981',
      message: '#06b6d4',
      review: '#f43f5e',
      document: '#64748b',
      doctor_verification: '#10b981',
      security: '#ef4444',
      system: '#64748b',
    };
    return colors[type] || '#64748b';
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="nb-wrapper" ref={dropdownRef}>
      <button
        className={`nb-trigger ${open ? 'open' : ''}`}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) fetchNotifications();
        }}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="nb-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="nb-dropdown">
          {/* Header */}
          <div className="nb-header">
            <div>
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <span className="nb-unread-label">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="nb-header-actions">
              {unreadCount > 0 && (
                <button
                  className="nb-mark-all"
                  onClick={markAllRead}
                  disabled={loading}
                  title="Mark all as read"
                >
                  {loading ? (
                    <Loader size={14} className="spin" />
                  ) : (
                    <><CheckCheck size={14} /> <span>Mark all</span></>
                  )}
                </button>
              )}
              <button className="nb-close" onClick={() => setOpen(false)}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="nb-list">
            {notifications.length === 0 ? (
              <div className="nb-empty">
                <Bell size={32} />
                <p>No notifications yet</p>
                <span>You're all caught up!</span>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = getIcon(n.notification_type);
                const color = getIconColor(n.notification_type);
                return (
                  <button
                    key={n.id}
                    className={`nb-item ${!n.is_read ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="nb-item-icon" style={{ background: `${color}15`, color }}>
                      <Icon size={16} />
                    </div>
                    <div className="nb-item-content">
                      <div className="nb-item-top">
                        <h4>{n.title}</h4>
                        {!n.is_read && <span className="nb-dot" />}
                      </div>
                      <p>{n.message}</p>
                      <span className="nb-time">{timeAgo(n.created_at)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="nb-footer">
              <button onClick={() => { setOpen(false); navigate('/notifications'); }}>
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;