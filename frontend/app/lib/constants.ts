import {
  LayoutDashboard,
  Upload,
  Search,
  Map,
  TrendingUp,
  Trophy,
  Settings,
  Users,
  Briefcase,
  BarChart3,
  Mail,
  FileText,
  Brain,
  CreditCard,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const JOBSEEKER_NAV: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Upload CV', href: '/dashboard/analyze', icon: Upload },
      { label: 'Gap Detail', href: '/dashboard/gap', icon: Search },
      { label: 'Roadmap', href: '/dashboard/roadmap', icon: Map },
      { label: 'Progress', href: '/dashboard/progress', icon: TrendingUp },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Achievements', href: '/dashboard/achievements', icon: Trophy },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

export const COMPANY_NAV: NavSection[] = [
  {
    title: 'Company',
    items: [
      { label: 'Overview', href: '/dashboard/company', icon: LayoutDashboard },
      { label: 'Talent Pool', href: '/dashboard/company/talent', icon: Users },
      { label: 'Job Roles', href: '/dashboard/company/roles', icon: Briefcase },
      { label: 'Gap Analytics', href: '/dashboard/company/analytics', icon: BarChart3 },
      { label: 'Invite & Assess', href: '/dashboard/company/invite', icon: Mail },
      { label: 'Reports', href: '/dashboard/company/reports', icon: FileText },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Settings', href: '/dashboard/company/settings', icon: Settings },
    ],
  },
];

export const ADMIN_NAV: NavSection[] = [
  {
    title: 'Admin',
    items: [
      { label: 'Platform Overview', href: '/dashboard/admin', icon: LayoutDashboard },
      { label: 'User Management', href: '/dashboard/admin/users', icon: Users },
      { label: 'Companies', href: '/dashboard/admin/companies', icon: Briefcase },
      { label: 'Analytics', href: '/dashboard/admin/analytics', icon: BarChart3 },
      { label: 'AI Management', href: '/dashboard/admin/ai', icon: Brain },
      { label: 'Billing', href: '/dashboard/admin/billing', icon: CreditCard },
      { label: 'System Config', href: '/dashboard/admin/config', icon: Wrench },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

export type UserRole = 'JOBSEEKER' | 'COMPANY' | 'ADMIN';

export function getNavForRole(role: UserRole): NavSection[] {
  switch (role) {
    case 'COMPANY':
      return COMPANY_NAV;
    case 'ADMIN':
      return ADMIN_NAV;
    default:
      return JOBSEEKER_NAV;
  }
}
