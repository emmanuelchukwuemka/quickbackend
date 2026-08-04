import { useMemo, useState } from 'react';
import Panel from '../components/Panel';
import SearchInput from '../components/SearchInput';
import StatusBadge from '../components/StatusBadge';
import AsyncState from '../components/AsyncState';
import { useApiList } from '../hooks/useApiList';
import { fetchDashboardSource } from '../lib/api';
import { formatDate, formatNaira, formatTime } from '../lib/format';

function paymentStatus(rideStatus: string): { label: string; tone: 'green' | 'gray' | 'amber' } {
  const s = rideStatus.toLowerCase();
  if (s === 'completed') return { label: 'Paid', tone: 'green' };
  if (s === 'cancelled') return { label: 'Not Charged', tone: 'gray' };
  return { label: 'Pending', tone: 'amber' };
}

export default function Payments() {
  const { loading, error, data } = useApiList(fetchDashboardSource);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    if (!data) return [];
    const usersById = new Map(data.users.map((u) => [String(u.id), u]));
    return [...data.rides]
      .sort((a, b) => new Date(b.requested_at || 0).getTime() - new Date(a.requested_at || 0).getTime())
      .map((r) => {
        const status = paymentStatus(r.status);
        return {
          id: r.id,
          passenger: r.passenger_ref ? usersById.get(r.passenger_ref)?.display_name || 'Unknown passenger' : 'Unknown',
          amount: formatNaira(r.final_fare || 0),
          method: r.payment_method ? r.payment_method.charAt(0).toUpperCase() + r.payment_method.slice(1) : '—',
          statusLabel: status.label,
          statusTone: status.tone,
          date: formatDate(r.requested_at),
          time: formatTime(r.requested_at),
        };
      });
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.passenger.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <AsyncState loading={loading} error={error} data={data} loadingLabel="Loading payments…">
      {() => (
        <Panel
          title={`Payments (${filtered.length})`}
          action={<SearchInput value={search} onChange={setSearch} placeholder="Search by passenger, trip ID..." />}
        >
          <p className="mb-4 text-xs text-gray-400">
            Derived from ride fares and payment methods — there's no separate payment-transaction ledger yet.
          </p>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No payment activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="py-2 pr-4 font-medium">Trip ID</th>
                    <th className="py-2 pr-4 font-medium">Passenger</th>
                    <th className="py-2 pr-4 font-medium">Amount</th>
                    <th className="py-2 pr-4 font-medium">Method</th>
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
                      <td className="py-3 pr-4 text-gray-600">{r.passenger}</td>
                      <td className="py-3 pr-4 text-gray-600">{r.amount}</td>
                      <td className="py-3 pr-4 text-gray-600">{r.method}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge label={r.statusLabel} tone={r.statusTone} />
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
