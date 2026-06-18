'use client';

import { usePathname } from 'next/navigation';
import { Bell, Menu } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard Overview',
  '/dashboard/analyze': 'Upload & Analyze',
  '/dashboard/gap': 'Skill Gap Detail',
  '/dashboard/roadmap': 'Training Roadmap',
  '/dashboard/progress': 'Progress Tracking',
  '/dashboard/achievements': 'Achievements',
  '/dashboard/settings': 'Settings',
  '/dashboard/company': 'Company Overview',
  '/dashboard/admin': 'Admin Panel',
};

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const title = pageTitles[pathname] || 'Dashboard';

  return (
    <header className="dash-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="dash-mobile-toggle" onClick={onMenuClick} title="Menu">
          <Menu size={18} />
        </button>
        <h1 className="dash-topbar-title">{title}</h1>
      </div>
      <div className="dash-topbar-actions">
        <button className="dash-topbar-btn" title="Notifications">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
