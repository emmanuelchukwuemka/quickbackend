import type { RecentTripRow } from '../lib/dashboardStats';
import { initials } from '../lib/format';

const statusStyles: Record<RecentTripRow['statusCategory'], string> = {
  completed: 'bg-emerald-50 text-emerald-600',
  active: 'bg-blue-50 text-blue-600',
  cancelled: 'bg-red-50 text-red-600',
};

function Person({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-500">
        {initials(name)}
      </span>
      {name}
    </span>
  );
}

interface RecentTripsTableProps {
  trips: RecentTripRow[];
}

export default function RecentTripsTable({ trips }: RecentTripsTableProps) {
  if (trips.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No trips recorded yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
            <th className="py-2 pr-4 font-medium">Trip ID</th>
            <th className="py-2 pr-4 font-medium">Driver</th>
            <th className="py-2 pr-4 font-medium">Passenger</th>
            <th className="py-2 pr-4 font-medium">From - To</th>
            <th className="py-2 pr-4 font-medium">Fare</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 pr-4 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {trips.map((trip) => (
            <tr key={trip.id} className="border-b border-gray-50 last:border-0">
              <td className="py-3 pr-4 font-medium text-gray-700" title={trip.id}>
                #{trip.id.slice(0, 8)}
              </td>
              <td className="py-3 pr-4 text-gray-600"><Person name={trip.driver} /></td>
              <td className="py-3 pr-4 text-gray-600"><Person name={trip.passenger} /></td>
              <td className="py-3 pr-4 text-gray-600">{trip.from} → {trip.to}</td>
              <td className="py-3 pr-4 text-gray-600">{trip.fare}</td>
              <td className="py-3 pr-4">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[trip.statusCategory]}`}>
                  {trip.status}
                </span>
              </td>
              <td className="py-3 pr-4 text-gray-500">{trip.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
