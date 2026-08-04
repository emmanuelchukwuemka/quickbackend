import { useMemo, useState } from 'react';
import Panel from '../components/Panel';
import SearchInput from '../components/SearchInput';
import StatusBadge from '../components/StatusBadge';
import AsyncState from '../components/AsyncState';
import { useApiList } from '../hooks/useApiList';
import { fetchBookingsSource } from '../lib/api';
import { formatDate, formatNaira, formatTime } from '../lib/format';
import { shortenAddress } from '../lib/rideHelpers';

function statusTone(status?: string): 'green' | 'amber' | 'red' | 'blue' | 'gray' {
  switch ((status || '').toLowerCase()) {
    case 'completed':
      return 'green';
    case 'cancelled':
      return 'red';
    case 'accepted':
    case 'assigned':
      return 'blue';
    case 'pending':
      return 'amber';
    default:
      return 'gray';
  }
}

export default function Bookings() {
  const { loading, error, data } = useApiList(fetchBookingsSource);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    if (!data) return [];
    const driversById = new Map(data.drivers.map((d) => [String(d.id), d]));
    return [...data.scheduledRides]
      .sort((a, b) => new Date(a.scheduled_time || 0).getTime() - new Date(b.scheduled_time || 0).getTime())
      .map((sr) => ({
        id: sr.id,
        passenger: sr.passenger_name || 'Unknown passenger',
        driver: sr.driver_ref ? driversById.get(sr.driver_ref)?.display_name || 'Assigned driver' : 'Unassigned',
        from: shortenAddress(sr.pickup_address),
        to: shortenAddress(sr.dropoff_address),
        fare: formatNaira(sr.estimated_fare || 0),
        status: sr.status || 'Pending',
        scheduledDate: formatDate(sr.scheduled_time),
        scheduledTime: formatTime(sr.scheduled_time),
      }));
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.passenger.toLowerCase().includes(q) || r.driver.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <AsyncState loading={loading} error={error} data={data} loadingLabel="Loading bookings…">
      {() => (
        <Panel
          title={`Bookings (${filtered.length})`}
          action={<SearchInput value={search} onChange={setSearch} placeholder="Search bookings..." />}
        >
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No scheduled bookings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="py-2 pr-4 font-medium">Passenger</th>
                    <th className="py-2 pr-4 font-medium">Driver</th>
                    <th className="py-2 pr-4 font-medium">From - To</th>
                    <th className="py-2 pr-4 font-medium">Est. Fare</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Scheduled For</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4 font-medium text-gray-700">{r.passenger}</td>
                      <td className="py-3 pr-4 text-gray-600">{r.driver}</td>
                      <td className="py-3 pr-4 text-gray-600">{r.from} → {r.to}</td>
                      <td className="py-3 pr-4 text-gray-600">{r.fare}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge label={r.status} tone={statusTone(r.status)} />
                      </td>
                      <td className="py-3 pr-4 text-gray-500">
                        {r.scheduledDate} · {r.scheduledTime}
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
