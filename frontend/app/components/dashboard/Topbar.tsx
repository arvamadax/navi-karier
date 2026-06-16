'use client';

import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard Overview',
  '/dashboard/analyze': 'Upload & Analyze',
  '/dashboard/gap': 'Skill Gap Detail',
  '/dashboard/roadmap': 'Training Roadmap',
  '/dashboard/progress': 'Progress Tracking',
  '/dashboard/settings': 'Settings',
  '/dashboard/company': 'Company Overview',
  '/dashboard/admin': 'Admin Panel',
};

export default function Topbar() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || 'Dashboard';

  return (
    <header className="dash-topbar">
      <h1 className="dash-topbar-title">{title}</h1>
      <div className="dash-topbar-actions">
        <button className="dash-topbar-btn" title="Notifications">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
