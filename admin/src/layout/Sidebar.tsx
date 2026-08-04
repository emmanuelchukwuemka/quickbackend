import { NavLink } from 'react-router-dom';
import { MapPin, LifeBuoy, X, LogOut } from 'lucide-react';
import { navItems } from './navItems';
import { useAuth } from '../context/AuthContext';
import { initials } from '../lib/format';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  support: 'Support',
  finance: 'Finance',
  operations: 'Operations',
};

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { admin, logout } = useAuth();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 shrink-0 flex-col bg-[#0B3B2E] text-white transition-transform duration-200 md:sticky md:top-0 md:z-0 md:h-screen md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <MapPin size={20} className="text-emerald-400" />
            </span>
            <div>
              <p className="text-base font-semibold leading-tight">QuickDrop</p>
              <p className="text-xs text-white/50 leading-tight">Admin Panel</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/70 hover:bg-white/10 md:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 space-y-3">
          <div className="rounded-xl bg-emerald-600/20 border border-emerald-500/30 p-4">
            <LifeBuoy size={20} className="text-emerald-400 mb-2" />
            <p className="text-sm font-medium">Need Help?</p>
            <p className="text-xs text-white/60">Contact support</p>
          </div>

          <div className="flex items-center gap-3 border-t border-white/10 pt-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-semibold">
              {initials(admin?.display_name || admin?.email || '?')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{admin?.display_name || admin?.email || 'Admin'}</p>
              <p className="text-xs text-white/50">{admin ? ROLE_LABEL[admin.role] || admin.role : ''}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
