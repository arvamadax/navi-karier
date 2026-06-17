'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getNavForRole, type UserRole } from '../../lib/constants';

const ROLE_LABELS: Record<UserRole, string> = {
  JOBSEEKER: 'Job Seeker',
  COMPANY: 'Company',
  ADMIN: 'Admin',
};

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const role = (session?.user?.role ?? 'JOBSEEKER') as UserRole;
  const sections = getNavForRole(role);

  const userName = session?.user?.name ?? 'User';
  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="dash-sidebar">
      <div className="dash-sidebar-logo">
        <Link href="/" className="dash-logo-link">
          <Image src="/assets/logonavi.png" alt="NaviKarier Logo" width={24} height={24} />
          <span>NaviKarier</span>
        </Link>
      </div>

      <nav className="dash-sidebar-nav">
        {sections.map((section) => (
          <div key={section.title} className="dash-nav-section">
            <div className="dash-nav-title">{section.title}</div>
            {section.items.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn('dash-nav-item', isActive && 'active')}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="dash-sidebar-footer">
        <div className="dash-user-info">
          <div className="dash-avatar">{initials}</div>
          <div className="dash-user-meta">
            <div className="dash-user-name">{userName}</div>
            <div className="dash-user-role">{ROLE_LABELS[role]}</div>
          </div>
        </div>
        <button
          onClick={async () => {
            await signOut({ redirect: false });
            window.location.href = '/login';
          }}
          className="dash-logout-btn"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
