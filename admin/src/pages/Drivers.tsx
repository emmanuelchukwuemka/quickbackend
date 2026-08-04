import { useMemo, useState } from 'react';
import Panel from '../components/Panel';
import SearchInput from '../components/SearchInput';
import StatusBadge from '../components/StatusBadge';
import AsyncState from '../components/AsyncState';
import { useApiList } from '../hooks/useApiList';
import { approveDriver, fetchDrivers, rejectDriver, suspendDriver, reactivateDriver, type ApiDriver } from '../lib/api';
import { formatDate, formatNaira, initials } from '../lib/format';
import { Check, X, Ban, RotateCcw } from 'lucide-react';

const FILTERS = ['All', 'Pending', 'Approved', 'Rejected'] as const;

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

export default function Drivers() {
  const { loading, error, data, refetch } = useApiList(fetchDrivers);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [actingId, setActingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((d) => {
      const matchesFilter = filter === 'All' || (d.verification_status || 'pending').toLowerCase() === filter.toLowerCase();
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q || d.display_name?.toLowerCase().includes(q) || d.phone_number?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [data, search, filter]);

  async function handleAction(id: string, action: 'approve' | 'reject' | 'suspend' | 'reactivate') {
    setActingId(id);
    try {
      const fn = { approve: approveDriver, reject: rejectDriver, suspend: suspendDriver, reactivate: reactivateDriver }[action];
      await fn(id);
      await refetch();
    } finally {
      setActingId(null);
    }
  }

  return (
    <AsyncState loading={loading} error={error} data={data} loadingLabel="Loading drivers…">
      {() => (
        <Panel
          title={`Drivers (${filtered.length})`}
          action={<SearchInput value={search} onChange={setSearch} placeholder="Search drivers..." />}
        >
          <div className="mb-4 flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  filter === f ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No drivers match this filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="py-2 pr-4 font-medium">Driver</th>
                    <th className="py-2 pr-4 font-medium">Vehicle</th>
                    <th className="py-2 pr-4 font-medium">Rating</th>
                    <th className="py-2 pr-4 font-medium">Trips</th>
                    <th className="py-2 pr-4 font-medium">Wallet</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Joined</th>
                    <th className="py-2 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d: ApiDriver) => {
                    const v = verificationTone(d.verification_status);
                    const busy = actingId === String(d.id);
                    const isPending = (d.verification_status || 'pending').toLowerCase() === 'pending';
                    return (
                      <tr key={d.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            {d.photo_url ? (
                              <img
                                src={d.photo_url}
                                alt={d.display_name || 'Driver'}
                                className="h-8 w-8 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                                {initials(d.display_name || 'Driver')}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-700">{d.display_name || 'Unnamed driver'}</p>
                              <p className="truncate text-xs text-gray-400">{d.phone_number || d.email || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-600">{d.car_model?.trim() || 'No vehicle on file'}</td>
                        <td className="py-3 pr-4 text-gray-600">{d.driver_rating ? d.driver_rating.toFixed(1) : '—'}</td>
                        <td className="py-3 pr-4 text-gray-600">{d.total_trips ?? 0}</td>
                        <td className="py-3 pr-4 text-gray-600">{formatNaira(d.wallet_balance || 0)}</td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            <StatusBadge label={v.label} tone={v.tone} />
                            {d.is_active === false && <StatusBadge label="Suspended" tone="red" />}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-500">{formatDate(d.created_time)}</td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-2">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleAction(String(d.id), 'approve')}
                                  className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  <Check size={12} />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleAction(String(d.id), 'reject')}
                                  className="flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                                >
                                  <X size={12} />
                                  Reject
                                </button>
                              </>
                            )}
                            {d.is_active === false ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleAction(String(d.id), 'reactivate')}
                                className="flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
                              >
                                <RotateCcw size={12} />
                                Reactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleAction(String(d.id), 'suspend')}
                                className="flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                              >
                                <Ban size={12} />
                                Suspend
                              </button>
                            )}
                          </div>
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
