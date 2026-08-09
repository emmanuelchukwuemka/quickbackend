import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, X, Ban, RotateCcw, Car, Star, Wallet as WalletIcon } from 'lucide-react';
import Panel from '../components/Panel';
import AsyncState from '../components/AsyncState';
import StatusBadge from '../components/StatusBadge';
import { useDriverDetail } from '../hooks/useDriverDetail';
import { approveDriver, rejectDriver, suspendDriver, reactivateDriver } from '../lib/api';
import { formatDate, formatNaira, formatTime, initials } from '../lib/format';
import { shortenAddress, statusCategory, statusLabel } from '../lib/rideHelpers';

function verificationTone(status?: string): { label: string; tone: 'amber' | 'green' | 'red' | 'gray' } {
  switch ((status || 'pending').toLowerCase()) {
    case 'approved':
      return { label: 'Approved', tone: 'green' };
    case 'rejected':
      return { label: 'Rejected', tone: 'red' };
    default:
      return { label: 'Pending', tone: 'amber' };
  }
}

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

export default function DriverDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loading, error, data, refetch } = useDriverDetail(id);
  const [busy, setBusy] = useState(false);

  async function handleAction(action: 'approve' | 'reject' | 'suspend' | 'reactivate') {
    if (!id) return;
    setBusy(true);
    try {
      const fn = { approve: approveDriver, reject: rejectDriver, suspend: suspendDriver, reactivate: reactivateDriver }[action];
      await fn(id);
      await refetch();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AsyncState loading={loading} error={error} data={data} loadingLabel="Loading driver…">
      {({ driver, rides, transactions, tripsCompleted, totalEarned, totalCommission }) => {
        const v = verificationTone(driver.verification_status);
        const isPending = (driver.verification_status || 'pending').toLowerCase() === 'pending';
        const suspended = driver.is_active === false;
        const recentRides = [...rides]
          .sort((a, b) => new Date(b.requested_at || 0).getTime() - new Date(a.requested_at || 0).getTime())
          .slice(0, 8);
        const recentTxns = [...transactions]
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
          .slice(0, 8);

        return (
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => navigate('/drivers')}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={16} />
              Back to Drivers
            </button>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {driver.photo_url ? (
                    <img src={driver.photo_url} alt={driver.display_name} className="h-16 w-16 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-500">
                      {initials(driver.display_name || 'Driver')}
                    </span>
                  )}
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">{driver.display_name || 'Unnamed driver'}</h1>
                    <p className="text-sm text-gray-500">{driver.phone_number || driver.email || '—'}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StatusBadge label={v.label} tone={v.tone} />
                      {suspended && <StatusBadge label="Suspended" tone="red" />}
                      <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                        <Car size={12} /> {driver.car_model?.trim() || 'No vehicle on file'}
                      </span>
                      <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                        <Star size={12} /> {driver.driver_rating ? driver.driver_rating.toFixed(1) : '—'}
                      </span>
                      <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                        <WalletIcon size={12} /> {formatNaira(driver.wallet_balance || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {isPending && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleAction('approve')}
                        className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Check size={12} /> Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleAction('reject')}
                        className="flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        <X size={12} /> Reject
                      </button>
                    </>
                  )}
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

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatTile label="Trips Completed" value={String(tripsCompleted)} />
              <StatTile label="Total Earned" value={formatNaira(totalEarned)} />
              <StatTile label="Commission Collected" value={formatNaira(totalCommission)} />
              <StatTile label="Current Wallet Balance" value={formatNaira(driver.wallet_balance || 0)} />
            </div>

            <Panel title="Personal Information">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['Email', driver.email],
                  ['Date of Birth', driver.date_of_birth],
                  ['Gender', driver.gender],
                  ['Residential Address', driver.residential_address],
                  ['State', driver.state],
                  ['LGA', driver.lga],
                  ['Emergency Contact', driver.emergency_contact_name],
                  ['Emergency Contact Phone', driver.emergency_contact_phone],
                  ['Relationship', driver.emergency_contact_relationship],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
                    <dd className="mt-1 text-sm text-gray-700">{value || <span className="text-gray-300">Not provided</span>}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel title="Identification & Vehicle">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['NIN', driver.nin],
                  ["License Number", driver.license_number],
                  ['License Expiry', driver.license_expiry],
                  ['Vehicle Make', driver.vehicle_make],
                  ['Vehicle Model', driver.car_model],
                  ['Vehicle Year', driver.vehicle_year],
                  ['Vehicle Colour', driver.vehicle_colour],
                  ['Plate Number', driver.car_plate],
                  ['Registration Number', driver.vehicle_registration_number],
                  ['Seats', driver.seat_count != null ? String(driver.seat_count) : undefined],
                  ['Air-Conditioned', driver.is_air_conditioned == null ? undefined : driver.is_air_conditioned ? 'Yes' : 'No'],
                  ['Ownership', driver.vehicle_ownership],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
                    <dd className="mt-1 text-sm text-gray-700">{value || <span className="text-gray-300">Not provided</span>}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel title="Documents">
              {(() => {
                const docs = (driver.documents || []).filter((d) => !d.type.startsWith('Vehicle —'));
                return docs.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">No documents uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {docs.map((doc, i) => (
                      <a
                        key={i}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group overflow-hidden rounded-lg border border-gray-100 hover:border-gray-200"
                      >
                        <div className="aspect-video w-full overflow-hidden bg-gray-50">
                          <img
                            src={doc.url}
                            alt={doc.type}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        </div>
                        <p className="truncate px-2 py-1.5 text-xs font-medium text-gray-600">{doc.type}</p>
                      </a>
                    ))}
                  </div>
                );
              })()}
            </Panel>

            <Panel title="Vehicle Photos">
              {(() => {
                const photos = (driver.documents || []).filter((d) => d.type.startsWith('Vehicle —'));
                return photos.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">No vehicle photos uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {photos.map((doc, i) => (
                      <a
                        key={i}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group overflow-hidden rounded-lg border border-gray-100 hover:border-gray-200"
                      >
                        <div className="aspect-video w-full overflow-hidden bg-gray-50">
                          <img
                            src={doc.url}
                            alt={doc.type}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        </div>
                        <p className="truncate px-2 py-1.5 text-xs font-medium text-gray-600">{doc.type.replace('Vehicle — ', '')}</p>
                      </a>
                    ))}
                  </div>
                );
              })()}
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

            <Panel title="Wallet Activity">
              {recentTxns.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No wallet activity yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                        <th className="py-2 pr-4 font-medium">Type</th>
                        <th className="py-2 pr-4 font-medium">Amount</th>
                        <th className="py-2 pr-4 font-medium">Balance After</th>
                        <th className="py-2 pr-4 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTxns.map((t) => (
                        <tr key={t.id} className="border-b border-gray-50 last:border-0">
                          <td className="py-3 pr-4">
                            <StatusBadge
                              label={t.type === 'topup' ? 'Top-up' : t.type === 'commission' ? 'Commission' : 'Adjustment'}
                              tone={t.type === 'topup' ? 'green' : t.type === 'commission' ? 'amber' : 'gray'}
                            />
                          </td>
                          <td className={`py-3 pr-4 font-medium ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {t.amount >= 0 ? '+' : ''}
                            {formatNaira(t.amount)}
                          </td>
                          <td className="py-3 pr-4 text-gray-600">{formatNaira(t.balance_after)}</td>
                          <td className="py-3 pr-4 text-gray-500">
                            {formatDate(t.created_at)} · {formatTime(t.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Link to="/drivers" className="inline-block text-xs font-medium text-blue-600 hover:underline">
              ← Back to all drivers
            </Link>
          </div>
        );
      }}
    </AsyncState>
  );
}
