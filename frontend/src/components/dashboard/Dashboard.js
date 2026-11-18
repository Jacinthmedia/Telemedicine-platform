import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Dashboard = () => {
  const { user, loading, isAuthenticated } = useAuth();

  // Wait for AuthContext to finish loading the current user
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#66756d' }}>
        Loading dashboard…
      </div>
    );
  }

  // Not authenticated → send to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Route by role
  switch (user.role) {
    case 'patient':
      return <Navigate to="/patient/dashboard" replace />;
    case 'doctor':
      return <Navigate to="/doctor/dashboard" replace />;
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    default:
      return (
        <div style={{ padding: 40, color: '#a12828' }}>
          <h2>Account role unknown</h2>
          <p>
            Your account role is <code>{String(user.role)}</code>.
            Please contact support.
          </p>
        </div>
      );
  }
};

export default Dashboard;
