'use client';

import { useState } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import Topbar from '../components/dashboard/Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dash-shell">
      <div
        className={`dash-sidebar-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="dash-main">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="dash-content">
          {children}
        </main>
      </div>
    </div>
  );
}
