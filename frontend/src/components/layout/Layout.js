
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import './Layout.css';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="layout-container">
      <div
        className={`mobile-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(prev => !prev)}
      />

      <div className={`layout-main ${collapsed ? 'collapsed' : ''}`}>
        <TopNav onMenuClick={toggleSidebar} />

        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
