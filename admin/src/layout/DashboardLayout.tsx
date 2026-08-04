import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { navItems } from './navItems';

export default function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const title = navItems.find((n) => (n.path === '/' ? pathname === '/' : pathname.startsWith(n.path)))?.label ?? 'Dashboard';

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} onMenuClick={() => setMenuOpen(true)} />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
        <footer className="flex flex-col items-center justify-between gap-2 border-t border-gray-200 px-6 py-4 text-xs text-gray-400 sm:flex-row">
          <span>© 2025 QuickDrop. All rights reserved.</span>
          <span>Version 1.0.0</span>
        </footer>
      </div>
    </div>
  );
}
