import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Pill,
  MessageSquare,
  CreditCard,
  User,
  Settings,
  Users,
  Stethoscope,
  UserCheck,
  Activity,
  LogOut,
  X,
  Heart,
  FolderOpen,
  ChevronsLeft,
  ChevronsRight,
  Video,
  Wallet,
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, collapsed = false, onToggleCollapsed }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || 'patient';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuByRole = {
    patient: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/patient/dashboard' },
      { label: 'Appointments', icon: Calendar, path: '/patient/appointments' },
      { label: 'Find Doctor', icon: Stethoscope, path: '/patient/doctors' },
      { label: 'Medical Records', icon: FileText, path: '/patient/medical-records' },
      { label: 'Prescriptions', icon: Pill, path: '/patient/prescriptions' },
      { label: 'Documents', icon: FolderOpen, path: '/patient/documents' },
      { label: 'Call History', icon: Video, path: '/call-history' },
      { label: 'Messages', icon: MessageSquare, path: '/chat' },
      { label: 'Payments', icon: CreditCard, path: '/patient/payments' },
      { label: 'Profile', icon: User, path: '/patient/profile' },
      { label: 'Settings', icon: Settings, path: '/patient/settings' },
    ],
    doctor: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/doctor/dashboard' },
      { label: 'Appointments', icon: Calendar, path: '/patient/appointments' },
      { label: 'Availability', icon: Activity, path: '/doctor/availability' },
      { label: 'Medical Records', icon: FileText, path: '/patient/medical-records' },
      { label: 'Prescriptions', icon: Pill, path: '/patient/prescriptions' },
      { label: 'Documents', icon: FolderOpen, path: '/patient/documents' },
      { label: 'Call History', icon: Video, path: '/call-history' },
      { label: 'Messages', icon: MessageSquare, path: '/chat' },
      { label: 'Profile', icon: User, path: '/doctor/profile' },
      { label: 'Wallet', icon: Wallet, path: '/doctor/wallet' },
      { label: 'Settings', icon: Settings, path: '/doctor/settings' },
    ],
    admin: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
      { label: 'Users', icon: Users, path: '/admin/users' },
      { label: 'Doctor Verification', icon: UserCheck, path: '/admin/doctor-verification' },
      { label: 'Appointments', icon: Calendar, path: '/admin/appointments' },
      { label: 'Payments', icon: CreditCard, path: '/admin/payments' },
      { label: 'System Logs', icon: Activity, path: '/admin/logs' },
      { label: 'Settings', icon: Settings, path: '/admin/settings' },
    ],
  };

  const menuItems = menuByRole[role] || menuByRole.patient;

  return (
    <aside className={'sidebar ' + (isOpen ? 'open' : '') + ' ' + (collapsed ? 'collapsed' : '')}>
      <div className='sidebar-brand'>
        <div className='brand-icon'>
          <Heart size={22} fill='white' />
        </div>
        <div className='brand-text'>
          <h2>MediCare</h2>
          <span>Telemedicine</span>
        </div>
        <button className='sidebar-close' onClick={onClose} aria-label='Close menu'>
          <X size={18} />
        </button>
        <button
          className='sidebar-collapse-btn'
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
        </button>
      </div>

      <div className='sidebar-user'>
        <div className='user-avatar'>
          {user?.first_name?.[0] || user?.username?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className='user-info'>
          <h4>
            {user?.first_name
              ? (user.first_name + ' ' + (user.last_name || '')).trim()
              : user?.username || 'User'}
          </h4>
          <span className={'role-badge role-' + role}>{role}</span>
        </div>
      </div>

      <nav className='sidebar-nav'>
        <ul>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    'sidebar-link ' + (isActive ? 'active' : '')
                  }
                  onClick={onClose}
                  data-label={item.label}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className='sidebar-footer'>
        <button className='logout-btn' onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
