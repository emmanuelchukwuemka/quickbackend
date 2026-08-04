import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import Panel from '../components/Panel';
import AsyncState from '../components/AsyncState';
import { useApiList } from '../hooks/useApiList';
import { fetchDashboardSource } from '../lib/api';
import { buildRideTypeBreakdown, buildSignupTrend, buildTopDrivers, buildTripsTrend, cancellationRate } from '../lib/analytics';

export default function Analytics() {
  const { loading, error, data } = useApiList(fetchDashboardSource);

  const analytics = useMemo(() => {
    if (!data) return null;
    return {
      tripsTrend: buildTripsTrend(data.rides, 30),
      signupTrend: buildSignupTrend(data.drivers, data.users, 30),
      rideTypes: buildRideTypeBreakdown(data.rides),
      topDrivers: buildTopDrivers(data.drivers, data.rides, 5),
      cancellationRate: cancellationRate(data.rides),
    };
  }, [data]);

  return (
    <AsyncState loading={loading} error={error} data={analytics} loadingLabel="Loading analytics…">
      {(a) => (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Cancellation Rate</p>
              <p className="text-xl font-semibold text-gray-900">{a.cancellationRate}%</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Ride Types Tracked</p>
              <p className="text-xl font-semibold text-gray-900">{a.rideTypes.length}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Active Drivers (with trips)</p>
              <p className="text-xl font-semibold text-gray-900">{a.topDrivers.length}</p>
            </div>
          </div>

          <Panel title="Trips — Last 30 Days">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={a.tripsTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EEF2F6" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} interval={4} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#E5E7EB', fontSize: 13 }} />
                  <Line type="monotone" dataKey="trips" stroke="#2563EB" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="New Signups — Last 30 Days">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={a.signupTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EEF2F6" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} interval={4} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#E5E7EB', fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="drivers" name="Drivers" stroke="#16A34A" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="passengers" name="Passengers" stroke="#F97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Panel title="Ride Type Breakdown">
              {a.rideTypes.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No trips recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {a.rideTypes.map((t) => (
                    <div key={t.label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{t.label}</span>
                      <span className="font-medium text-gray-700">
                        {t.count} ({t.percent}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Top Drivers (Completed Trips)">
              {a.topDrivers.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No completed trips yet.</p>
              ) : (
                <div className="space-y-2">
                  {a.topDrivers.map((d, i) => (
                    <div key={d.name + i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {i + 1}. {d.name}
                      </span>
                      <span className="font-medium text-gray-700">{d.completedTrips} trips</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}
    </AsyncState>
  );
}
