import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { initials, formatDate, formatTime } from '../lib/format';
import { fetchAdminAlerts, markAdminAlertRead, markAllAdminAlertsRead, type ApiAdminAlert } from '../lib/api';

interface TopbarProps {
  title: string;
  onMenuClick?: () => void;
}

const ALERT_POLL_MS = 30000;

export default function Topbar({ title, onMenuClick }: TopbarProps) {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<ApiAdminAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  async function loadAlerts() {
    try {
      const { notifications, unreadCount } = await fetchAdminAlerts();
      setAlerts(notifications);
      setUnreadCount(unreadCount);
    } catch {
      // Silently skip — a failed poll shouldn't disrupt the rest of the panel.
    }
  }

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, ALERT_POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleAlertClick(alert: ApiAdminAlert) {
    if (!alert.is_read) {
      await markAdminAlertRead(alert.id);
      await loadAlerts();
    }
    setOpen(false);
    if (alert.related_type === 'driver') navigate('/drivers');
  }

  async function handleMarkAllRead() {
    await markAllAdminAlertsRead();
    await loadAlerts();
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 md:hidden"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <Menu size={18} className="hidden text-gray-400 md:block" />
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="hidden flex-1 max-w-md items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 sm:flex">
        <Search size={16} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search for drivers, trips, users..."
          className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <span className="text-sm font-semibold text-gray-800">Alerts</span>
                {unreadCount > 0 && (
                  <button type="button" onClick={handleMarkAllRead} className="text-xs font-medium text-emerald-600 hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {alerts.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-gray-400">No alerts yet.</p>
                ) : (
                  alerts.slice(0, 20).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => handleAlertClick(a)}
                      className={`block w-full border-b border-gray-50 px-4 py-3 text-left last:border-0 hover:bg-gray-50 ${
                        a.is_read ? '' : 'bg-emerald-50/50'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-800">{a.title}</p>
                      {a.message && <p className="mt-0.5 text-xs text-gray-500">{a.message}</p>}
                      <p className="mt-1 text-[11px] text-gray-400">
                        {formatDate(a.created_at)} · {formatTime(a.created_at)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <button type="button" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-semibold text-white">
            {initials(admin?.display_name || admin?.email || '?')}
          </div>
          <span className="hidden text-sm font-medium text-gray-700 sm:block">{admin?.display_name || admin?.email || 'Admin'}</span>
          <ChevronDown size={16} className="hidden text-gray-400 sm:block" />
        </button>
      </div>
    </header>
  );
}
