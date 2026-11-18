import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Bell, CheckCircle, Calendar, MessageSquare } from 'lucide-react';
import './NotificationBell.css';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/');
      const list = res.data.results || res.data.data || res.data || [];
      // Show latest 5
      setNotifications(list.slice(0, 5));
      setUnreadCount(list.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/mark-read/`);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read/');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'appointment': return <Calendar size={16} className="text-green" />;
      case 'message': return <MessageSquare size={16} className="text-purple" />;
      default: return <CheckCircle size={16} className="text-blue" />;
    }
  };

  return (
    <div className="notif-wrap" ref={dropdownRef}>
      <button className="icon-btn" onClick={() => setIsOpen(!isOpen)}>
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="notif-mark-read">Mark all read</button>
            )}
          </div>
          
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">No notifications yet.</div>
            ) : (
              notifications.map((n) => (
                <Link 
                  to={n.link || '#'} 
                  key={n.id} 
                  className={'notif-item ' + (n.is_read ? 'read' : 'unread')}
                  onClick={() => { setIsOpen(false); if (!n.is_read) markAsRead(n.id); }}
                >
                  <div className="notif-icon">{getIcon(n.notification_type)}</div>
                  <div className="notif-content">
                    <p className="notif-title">{n.title}</p>
                    <p className="notif-message">{n.message}</p>
                    <span className="notif-time">{n.time_ago}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
          <div className="notif-footer">
            <Link to="/notifications" onClick={() => setIsOpen(false)}>View All Notifications</Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
