import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from '../../api/axios';
import { Search, Bell, Sun, Moon, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import './TopNav.css';

const TopNav = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark-mode');
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/notifications/');
      const data = res.data.results || res.data;
      setNotifications(Array.isArray(data) ? data.slice(0, 3) : []);
    } catch (err) {}
  };

  const getProfileLink = () => {
    if (user?.role === 'doctor') return '/doctor/profile';
    if (user?.role === 'patient') return '/patient/profile';
    return '/admin/settings';
  };

  const getSettingsLink = () => {
    if (user?.role === 'doctor') return '/doctor/settings';
    if (user?.role === 'patient') return '/patient/settings';
    return '/admin/settings';
  };

  return (
    <header className="topnav">
      <div className="topnav-left">
        <button className="mobile-menu-btn" onClick={onMenuClick}>
          <span></span><span></span><span></span>
        </button>
        <div className="topnav-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search doctors, appointments, records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
      </div>

      <div className="topnav-actions">
        <button className="theme-btn" onClick={toggleDarkMode}>
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        
        <div className="notif-wrapper" onMouseEnter={() => { setShowNotif(true); fetchNotifications(); }} onMouseLeave={() => setShowNotif(false)}>
          <button className="notif-btn" onClick={() => navigate('/notifications')}>
            <Bell size={18} />
            <span className="notif-dot"></span>
          </button>

          {showNotif && (
            <div className="notif-preview">
              <div className="notif-preview-header">
                <h4>Notifications</h4>
              </div>
              <div className="notif-preview-list">
                {notifications.length === 0 ? (
                  <p className="notif-empty">No new notifications.</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="notif-preview-item">
                      <p className="notif-title">{n.title}</p>
                      <p className="notif-message">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="notif-preview-footer">
                <Link to="/notifications">View all</Link>
              </div>
            </div>
          )}
        </div>

        <div className="user-dropdown-wrap">
          <button className="user-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
            <div className="user-avatar">{user?.username?.charAt(0).toUpperCase() || 'U'}</div>
            <div className="user-info">
              <span className="user-name">{user?.username || 'User'}</span>
              <span className="user-role">{user?.role || 'Member'}</span>
            </div>
            <ChevronDown size={16} className={`chevron ${dropdownOpen ? 'open' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="user-dropdown">
              {user?.role !== 'admin' && (
                <Link to={getProfileLink()} className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                  <User size={16} /> Profile
                </Link>
              )}
              <Link to={getSettingsLink()} className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                <Settings size={16} /> Settings
              </Link>
              <hr className="dropdown-divider" />
              <button onClick={handleLogout} className="dropdown-item logout-btn">
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNav;
