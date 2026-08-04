import { useMemo } from 'react';
import Panel from '../components/Panel';
import AsyncState from '../components/AsyncState';
import EarningsChart from '../components/EarningsChart';
import { useApiList } from '../hooks/useApiList';
import { fetchDashboardSource } from '../lib/api';
import { buildDailyEarnings } from '../lib/earnings';
import { formatDate, formatNaira, formatTime } from '../lib/format';

const SUMMARY_ICON_BG = 'bg-violet-500';

export default function Earnings() {
  const { loading, error, data } = useApiList(fetchDashboardSource);

  const summary = useMemo(() => {
    if (!data) return null;
    const completed = data.rides.filter((r) => r.status.toLowerCase() === 'completed');
    const total = completed.reduce((sum, r) => sum + (r.final_fare || 0), 0);
    const avg = completed.length ? total / completed.length : 0;
    const driversById = new Map(data.drivers.map((d) => [String(d.id), d]));

    const transactions = [...completed]
      .sort((a, b) => new Date(b.completed_at || b.requested_at || 0).getTime() - new Date(a.completed_at || a.requested_at || 0).getTime())
      .map((r) => ({
        id: r.id,
        driver: r.driver_ref ? driversById.get(r.driver_ref)?.display_name || 'Unassigned driver' : 'Unassigned',
        fare: formatNaira(r.final_fare || 0),
        date: formatDate(r.completed_at || r.requested_at),
        time: formatTime(r.completed_at || r.requested_at),
      }));

    return {
      total,
      avg,
      completedCount: completed.length,
      dailySeries: buildDailyEarnings(data.rides, 14),
      transactions,
    };
  }, [data]);

  return (
    <AsyncState loading={loading} error={error} data={summary} loadingLabel="Loading earnings…">
      {(s) => (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${SUMMARY_ICON_BG}`}>₦</span>
              <p className="mt-3 text-xs text-gray-500">Total Earnings</p>
              <p className="text-xl font-semibold text-gray-900">{formatNaira(s.total)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">#</span>
              <p className="mt-3 text-xs text-gray-500">Completed Trips</p>
              <p className="text-xl font-semibold text-gray-900">{s.completedCount}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white">~</span>
              <p className="mt-3 text-xs text-gray-500">Average Fare</p>
              <p className="text-xl font-semibold text-gray-900">{formatNaira(s.avg)}</p>
            </div>
          </div>

          <Panel title="Earnings — Last 14 Days">
            <EarningsChart data={s.dailySeries} />
          </Panel>

          <Panel title="Completed Trip Payouts">
            {s.transactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No completed trips yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                      <th className="py-2 pr-4 font-medium">Trip ID</th>
                      <th className="py-2 pr-4 font-medium">Driver</th>
                      <th className="py-2 pr-4 font-medium">Fare</th>
                      <th className="py-2 pr-4 font-medium">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.transactions.map((t) => (
                      <tr key={t.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-3 pr-4 font-medium text-gray-700" title={t.id}>
                          #{t.id.slice(0, 8)}
                        </td>
                        <td className="py-3 pr-4 text-gray-600">{t.driver}</td>
                        <td className="py-3 pr-4 text-gray-600">{t.fare}</td>
                        <td className="py-3 pr-4 text-gray-500">
                          {t.date} · {t.time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}
    </AsyncState>
  );
}
