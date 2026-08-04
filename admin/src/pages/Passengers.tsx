import { useMemo, useState } from 'react';
import Panel from '../components/Panel';
import SearchInput from '../components/SearchInput';
import AsyncState from '../components/AsyncState';
import { useApiList } from '../hooks/useApiList';
import { fetchUsers } from '../lib/api';
import { formatDate, formatNaira, initials } from '../lib/format';

export default function Passengers() {
  const { loading, error, data } = useApiList(fetchUsers);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (u) => u.display_name?.toLowerCase().includes(q) || u.phone_number?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [data, search]);

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
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="py-2 pr-4 font-medium">Passenger</th>
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Trips</th>
                    <th className="py-2 pr-4 font-medium">Wallet</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 last:border-0">
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
                      <td className="py-3 pr-4 text-gray-600">{u.numbe_trips ?? 0}</td>
                      <td className="py-3 pr-4 text-gray-600">{formatNaira(u.wallet_balance || 0)}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            u.is_online === 'Online' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {u.is_online === 'Online' ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{formatDate(u.created_time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </AsyncState>
  );
}
