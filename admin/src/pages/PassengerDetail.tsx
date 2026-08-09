import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Ban, RotateCcw, Wallet as WalletIcon } from 'lucide-react';
import Panel from '../components/Panel';
import AsyncState from '../components/AsyncState';
import StatusBadge from '../components/StatusBadge';
import { usePassengerDetail } from '../hooks/usePassengerDetail';
import { suspendPassenger, reactivatePassenger } from '../lib/api';
import { formatDate, formatNaira, formatTime, initials } from '../lib/format';
import { shortenAddress, statusCategory, statusLabel } from '../lib/rideHelpers';

function statusTone(category: string): 'green' | 'blue' | 'red' | 'amber' | 'gray' {
  if (category === 'completed') return 'green';
  if (category === 'cancelled') return 'red';
  return 'blue';
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export default function PassengerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loading, error, data, refetch } = usePassengerDetail(id);
  const [busy, setBusy] = useState(false);

  async function handleAction(action: 'suspend' | 'reactivate') {
    if (!id) return;
    setBusy(true);
    try {
      await (action === 'suspend' ? suspendPassenger(id) : reactivatePassenger(id));
      await refetch();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AsyncState loading={loading} error={error} data={data} loadingLabel="Loading passenger…">
      {({ passenger, rides, tripsCompleted, totalSpent }) => {
        const suspended = passenger.is_active === false;
        const recentRides = [...rides]
          .sort((a, b) => new Date(b.requested_at || 0).getTime() - new Date(a.requested_at || 0).getTime())
          .slice(0, 10);

        return (
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => navigate('/passengers')}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={16} />
              Back to Passengers
            </button>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {passenger.photo_url ? (
                    <img src={passenger.photo_url} alt={passenger.display_name} className="h-16 w-16 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-500">
                      {initials(passenger.display_name || 'Passenger')}
                    </span>
                  )}
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">{passenger.display_name || 'Unnamed passenger'}</h1>
                    <p className="text-sm text-gray-500">{passenger.phone_number || passenger.email || '—'}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          passenger.is_online === 'Online' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {passenger.is_online === 'Online' ? 'Online' : 'Offline'}
                      </span>
                      {suspended && <StatusBadge label="Suspended" tone="red" />}
                      <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                        <WalletIcon size={12} /> {formatNaira(passenger.wallet_balance || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {suspended ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAction('reactivate')}
                      className="flex items-center gap-1 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <RotateCcw size={12} /> Reactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAction('suspend')}
                      className="flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                    >
                      <Ban size={12} /> Suspend
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatTile label="Trips Taken" value={String(tripsCompleted)} />
              <StatTile label="Total Spent" value={formatNaira(totalSpent)} />
              <StatTile label="Wallet Balance" value={formatNaira(passenger.wallet_balance || 0)} />
            </div>

            <Panel title="Profile Details">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['Email', passenger.email],
                  ['Phone', passenger.phone_number],
                  ['Date of Birth', passenger.dob],
                  ['Gender', passenger.gender],
                  ['State', passenger.state],
                  ['Country', passenger.country],
                  ['User ID', passenger.uid],
                  ['Joined', formatDate(passenger.created_time)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
                    <dd className="mt-1 text-sm text-gray-700">{value || <span className="text-gray-300">Not provided</span>}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel title="Recent Trips">
              {recentRides.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No trips yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                        <th className="py-2 pr-4 font-medium">From</th>
                        <th className="py-2 pr-4 font-medium">To</th>
                        <th className="py-2 pr-4 font-medium">Fare</th>
                        <th className="py-2 pr-4 font-medium">Status</th>
                        <th className="py-2 pr-4 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRides.map((r) => (
                        <tr key={r.id} className="border-b border-gray-50 last:border-0">
                          <td className="py-3 pr-4 text-gray-600">{shortenAddress(r.pickup_address)}</td>
                          <td className="py-3 pr-4 text-gray-600">{shortenAddress(r.dropoff_address)}</td>
                          <td className="py-3 pr-4 text-gray-600">{formatNaira(r.final_fare || 0)}</td>
                          <td className="py-3 pr-4">
                            <StatusBadge label={statusLabel(r.status)} tone={statusTone(statusCategory(r.status))} />
                          </td>
                          <td className="py-3 pr-4 text-gray-500">
                            {formatDate(r.requested_at)} · {formatTime(r.requested_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Link to="/passengers" className="inline-block text-xs font-medium text-blue-600 hover:underline">
              ← Back to all passengers
            </Link>
          </div>
        );
      }}
    </AsyncState>
  );
}
