import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { Bell, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import './NotificationsPage.css';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await axios.get('/notifications/');
        const data = res.data.results || res.data;
        setNotifications(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error("Failed to load notifications");
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await axios.post(`/notifications/${id}/mark-read/`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      toast.error("Failed to mark as read");
    }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading notifications...</div>;

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <h1>Notifications</h1>
        <p>Stay updated with your latest activity.</p>
      </div>

      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} />
            <h3>No notifications yet</h3>
            <p>We'll let you know when something happens.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div key={notif.id} className={`notification-card ${notif.is_read ? 'read' : 'unread'}`}>
              <div className="notif-icon">
                <Bell size={20} />
              </div>
              <div className="notif-content">
                <h4>{notif.title}</h4>
                <p>{notif.message}</p>
                <span className="notif-time">{new Date(notif.created_at).toLocaleString()}</span>
              </div>
              {!notif.is_read && (
                <button className="mark-read-btn" onClick={() => markAsRead(notif.id)}>
                  <CheckCircle size={18} /> Mark read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
