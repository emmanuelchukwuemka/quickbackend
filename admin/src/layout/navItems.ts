import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  UserRound,
  Car,
  BookmarkCheck,
  CreditCard,
  Coins,
  Tag,
  MessageSquareWarning,
  Bell,
  BarChart3,
  Settings,
  ShieldCheck,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Drivers', path: '/drivers', icon: UserRound },
  { label: 'Passengers', path: '/passengers', icon: Users },
  { label: 'Trips', path: '/trips', icon: Car },
  { label: 'Bookings', path: '/bookings', icon: BookmarkCheck },
  { label: 'Payments', path: '/payments', icon: CreditCard },
  { label: 'Earnings', path: '/earnings', icon: Coins },
  { label: 'Promo Codes', path: '/promo-codes', icon: Tag },
  { label: 'Complaints', path: '/complaints', icon: MessageSquareWarning },
  { label: 'Notifications', path: '/notifications', icon: Bell },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Settings', path: '/settings', icon: Settings },
  { label: 'Users & Roles', path: '/users-roles', icon: ShieldCheck },
];
