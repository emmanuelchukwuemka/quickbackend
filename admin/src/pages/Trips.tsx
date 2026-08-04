import { useMemo, useState } from 'react';
import Panel from '../components/Panel';
import SearchInput from '../components/SearchInput';
import StatusBadge from '../components/StatusBadge';
import AsyncState from '../components/AsyncState';
import { useApiList } from '../hooks/useApiList';
import { fetchDashboardSource } from '../lib/api';
import { formatDate, formatNaira, formatTime } from '../lib/format';
import { shortenAddress, statusCategory, statusLabel, type StatusCategory } from '../lib/rideHelpers';

const FILTERS: { label: string; value: 'All' | StatusCategory }[] = [
  { label: 'All', value: 'All' },
  { label: 'Completed', value: 'completed' },
  { label: 'Active', value: 'active' },
  { label: 'Cancelled', value: 'cancelled' },
];

const badgeTone: Record<StatusCategory, 'green' | 'blue' | 'red'> = {
  completed: 'green',
  active: 'blue',
  cancelled: 'red',
};

export default function Trips() {
  const { loading, error, data } = useApiList(fetchDashboardSource);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | StatusCategory>('All');

  const rows = useMemo(() => {
    if (!data) return [];
    const driversById = new Map(data.drivers.map((d) => [String(d.id), d]));
    const usersById = new Map(data.users.map((u) => [String(u.id), u]));

    return [...data.rides]
      .sort((a, b) => new Date(b.requested_at || 0).getTime() - new Date(a.requested_at || 0).getTime())
      .map((r) => ({
        id: r.id,
        driver: r.driver_ref ? driversById.get(r.driver_ref)?.display_name || 'Unassigned driver' : 'Unassigned',
        passenger: r.passenger_ref ? usersById.get(r.passenger_ref)?.display_name || 'Unknown passenger' : 'Unknown',
        from: shortenAddress(r.pickup_address),
        to: shortenAddress(r.dropoff_address),
        fare: formatNaira(r.final_fare || 0),
        payment: r.payment_method ? r.payment_method.charAt(0).toUpperCase() + r.payment_method.slice(1) : '—',
        status: statusLabel(r.status),
        statusCategory: statusCategory(r.status),
        date: formatDate(r.requested_at),
        time: formatTime(r.requested_at),
      }));
  }, [data]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesFilter = filter === 'All' || r.statusCategory === filter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q || r.driver.toLowerCase().includes(q) || r.passenger.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [rows, search, filter]);

  return (
    <AsyncState loading={loading} error={error} data={data} loadingLabel="Loading trips…">
      {() => (
        <Panel
          title={`Trips (${filtered.length})`}
          action={<SearchInput value={search} onChange={setSearch} placeholder="Search by driver, passenger, ID..." />}
        >
          <div className="mb-4 flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  filter === f.value ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No trips match this filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="py-2 pr-4 font-medium">Trip ID</th>
                    <th className="py-2 pr-4 font-medium">Driver</th>
                    <th className="py-2 pr-4 font-medium">Passenger</th>
                    <th className="py-2 pr-4 font-medium">From - To</th>
                    <th className="py-2 pr-4 font-medium">Fare</th>
                    <th className="py-2 pr-4 font-medium">Payment</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4 font-medium text-gray-700" title={r.id}>
                        #{r.id.slice(0, 8)}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{r.driver}</td>
                      <td className="py-3 pr-4 text-gray-600">{r.passenger}</td>
                      <td className="py-3 pr-4 text-gray-600">{r.from} → {r.to}</td>
                      <td className="py-3 pr-4 text-gray-600">{r.fare}</td>
                      <td className="py-3 pr-4 text-gray-600">{r.payment}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge label={r.status} tone={badgeTone[r.statusCategory]} />
                      </td>
                      <td className="py-3 pr-4 text-gray-500">
                        {r.date} · {r.time}
                      </td>
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
