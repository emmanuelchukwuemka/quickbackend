import { Calendar, ChevronDown, Loader2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import Panel from '../components/Panel';
import EarningsChart from '../components/EarningsChart';
import TripsDonutChart from '../components/TripsDonutChart';
import LiveTripsMap from '../components/LiveTripsMap';
import RecentTripsTable from '../components/RecentTripsTable';
import PendingApprovals from '../components/PendingApprovals';
import { useDashboardData } from '../hooks/useDashboardData';

function ViewAllLink({ to }: { to: string }) {
  return (
    <Link to={to} className="text-xs font-medium text-blue-600 hover:underline">
      View All
    </Link>
  );
}

const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

export default function Dashboard() {
  const { loading, error, data } = useDashboardData();

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-gray-400">
        <Loader2 size={24} className="mr-2 animate-spin" />
        Loading live dashboard data…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-red-200 bg-red-50 text-center">
        <AlertTriangle size={24} className="text-red-500" />
        <p className="text-sm font-medium text-red-700">Couldn't load dashboard data</p>
        <p className="text-xs text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
        >
          <Calendar size={16} className="text-gray-400" />
          {today}
          <ChevronDown size={14} className="text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {data.statCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel
          title="Earnings Overview"
          action={
            <button type="button" className="flex items-center gap-1 text-xs text-gray-500">
              This Week <ChevronDown size={13} />
            </button>
          }
        >
          <EarningsChart data={data.earningsOverview} />
        </Panel>

        <Panel
          title="Trips Overview"
          action={
            <button type="button" className="flex items-center gap-1 text-xs text-gray-500">
              This Week <ChevronDown size={13} />
            </button>
          }
        >
          <TripsDonutChart total={data.tripsOverview.total} segments={data.tripsOverview.segments} />
        </Panel>

        <Panel title="Live Trips Map">
          <LiveTripsMap count={data.liveTripsCount} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="Recent Trips" action={<ViewAllLink to="/trips" />} className="lg:col-span-2">
          <RecentTripsTable trips={data.recentTrips} />
        </Panel>

        <Panel title="Pending Driver Approvals" action={<ViewAllLink to="/drivers" />}>
          <PendingApprovals approvals={data.pendingDriverApprovals} onActionComplete={() => window.location.reload()} />
        </Panel>
      </div>
    </div>
  );
}
