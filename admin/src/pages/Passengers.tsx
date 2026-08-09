import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Panel from '../components/Panel';
import SearchInput from '../components/SearchInput';
import StatusBadge from '../components/StatusBadge';
import AsyncState from '../components/AsyncState';
import { useApiList } from '../hooks/useApiList';
import { fetchPassengersSource, suspendPassenger, reactivatePassenger } from '../lib/api';
import { formatDate, formatNaira, initials } from '../lib/format';
import { Ban, RotateCcw } from 'lucide-react';

export default function Passengers() {
  const { loading, error, data, refetch } = useApiList(fetchPassengersSource);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const statsByUser = useMemo(() => {
    const map = new Map<string, { trips: number; spent: number }>();
    if (!data) return map;
    for (const r of data.rides) {
      if (r.status.toLowerCase() !== 'completed' || !r.passenger_ref) continue;
      const entry = map.get(r.passenger_ref) || { trips: 0, spent: 0 };
      entry.trips += 1;
      entry.spent += r.final_fare || 0;
      map.set(r.passenger_ref, entry);
    }
    return map;
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.users
      .filter(
        (u) => !q || u.display_name?.toLowerCase().includes(q) || u.phone_number?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
      )
      .sort((a, b) => new Date(b.created_time || 0).getTime() - new Date(a.created_time || 0).getTime());
  }, [data, search]);

  async function handleAction(id: string, action: 'suspend' | 'reactivate') {
    setActingId(id);
    try {
      await (action === 'suspend' ? suspendPassenger(id) : reactivatePassenger(id));
      await refetch();
    } finally {
      setActingId(null);
    }
  }

  return (
    <AsyncState loading={loading} error={error} data={data} loadingLabel="Loading passengers…">
      {() => (
        <Panel
          title={`Passengers (${filtered.length})`}
          action={<SearchInput value={search} onChange={setSearch} placeholder="Search passengers..." />}
        >
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No passengers match this search.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="py-2 pr-4 font-medium">Passenger</th>
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Trips</th>
                    <th className="py-2 pr-4 font-medium">Spent</th>
                    <th className="py-2 pr-4 font-medium">Wallet</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Joined</th>
                    <th className="py-2 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const busy = actingId === String(u.id);
                    const suspended = u.is_active === false;
                    const stats = statsByUser.get(String(u.id)) ?? statsByUser.get(u.uid) ?? { trips: u.numbe_trips ?? 0, spent: 0 };
                    return (
                      <tr
                        key={u.id}
                        onClick={() => navigate(`/passengers/${u.id}`)}
                        className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                              {initials(u.display_name || 'Passenger')}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-700">{u.display_name || 'Unnamed passenger'}</p>
                              <p className="truncate text-xs text-gray-400">{u.phone_number || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-600">{u.email || '—'}</td>
                        <td className="py-3 pr-4 text-gray-600">{stats.trips}</td>
                        <td className="py-3 pr-4 text-gray-600">{formatNaira(stats.spent)}</td>
                        <td className="py-3 pr-4 text-gray-600">{formatNaira(u.wallet_balance || 0)}</td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                u.is_online === 'Online' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {u.is_online === 'Online' ? 'Online' : 'Offline'}
                            </span>
                            {suspended && <StatusBadge label="Suspended" tone="red" />}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-500">{formatDate(u.created_time)}</td>
                        <td className="py-3 pr-4" onClick={(e) => e.stopPropagation()}>
                          {suspended ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleAction(String(u.id), 'reactivate')}
                              className="flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <RotateCcw size={12} />
                              Reactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleAction(String(u.id), 'suspend')}
                              className="flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                            >
                              <Ban size={12} />
                              Suspend
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </AsyncState>
  );
}
