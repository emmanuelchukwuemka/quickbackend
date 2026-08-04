import type { ApiDriver, ApiRide, ApiUser } from './api';
import { formatDate, formatNaira, formatNumber, formatTime } from './format';
import { shortenAddress, statusCategory, statusLabel, type StatusCategory } from './rideHelpers';

export type Trend = 'up' | 'down' | 'flat' | 'link';

export interface StatCardData {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: Trend;
  icon: string;
  color: 'green' | 'orange' | 'blue' | 'purple' | 'amber' | 'red';
}

export interface EarningsPoint {
  day: string;
  value: number;
}

export interface TripSegment {
  label: string;
  count: number;
  percent: number;
  color: string;
}

export interface RecentTripRow {
  id: string;
  driver: string;
  passenger: string;
  from: string;
  to: string;
  fare: string;
  status: string;
  statusCategory: StatusCategory;
  time: string;
  requestedAt: number;
}

export interface PendingApprovalRow {
  id: string;
  name: string;
  vehicle: string;
  applied: string;
}

export interface DashboardStats {
  statCards: StatCardData[];
  earningsOverview: EarningsPoint[];
  tripsOverview: { total: number; segments: TripSegment[] };
  recentTrips: RecentTripRow[];
  pendingDriverApprovals: PendingApprovalRow[];
  liveTripsCount: number;
}

const NOT_ACCEPTED_STATUSES = new Set(['pending', 'requested', 'searching']);
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfWeek(d: Date) {
  const copy = startOfDay(d);
  const day = copy.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? 6 : day - 1;
  copy.setDate(copy.getDate() - diffToMonday);
  return copy;
}

export function buildDashboardStats(drivers: ApiDriver[], users: ApiUser[], rides: ApiRide[]): DashboardStats {
  const now = new Date();
  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const today = startOfDay(now);

  // --- Drivers / Passengers ---
  const newDriversThisWeek = drivers.filter((d) => d.created_time && new Date(d.created_time) >= thisWeekStart).length;
  const newUsersThisWeek = users.filter((u) => u.created_time && new Date(u.created_time) >= thisWeekStart).length;

  // --- Rides ---
  const tripsToday = rides.filter((r) => r.requested_at && new Date(r.requested_at) >= today).length;
  const completedRides = rides.filter((r) => r.status.toLowerCase() === 'completed');
  const cancelledCount = rides.filter((r) => r.status.toLowerCase() === 'cancelled').length;
  const pendingCount = rides.filter((r) => NOT_ACCEPTED_STATUSES.has(r.status.toLowerCase())).length;
  const activeCount = rides.filter((r) => statusCategory(r.status) === 'active').length;
  const liveTripsCount = rides.filter((r) => ['accepted', 'in_progress'].includes(r.status.toLowerCase())).length;

  const totalEarnings = completedRides.reduce((sum, r) => sum + (r.final_fare || 0), 0);
  const earningsInRange = (start: Date, end: Date) =>
    completedRides
      .filter((r) => {
        const at = new Date(r.completed_at || r.requested_at || 0);
        return at >= start && at < end;
      })
      .reduce((sum, r) => sum + (r.final_fare || 0), 0);

  const thisWeekEarnings = earningsInRange(thisWeekStart, now);
  const lastWeekEarnings = earningsInRange(lastWeekStart, thisWeekStart);

  let earningsDelta: string;
  let earningsTrend: Trend;
  if (lastWeekEarnings > 0) {
    const pct = ((thisWeekEarnings - lastWeekEarnings) / lastWeekEarnings) * 100;
    earningsDelta = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs last week`;
    earningsTrend = pct >= 0 ? 'up' : 'down';
  } else if (thisWeekEarnings > 0) {
    earningsDelta = 'No earnings recorded last week';
    earningsTrend = 'flat';
  } else {
    earningsDelta = 'No earnings yet';
    earningsTrend = 'flat';
  }

  const statCards: StatCardData[] = [
    {
      id: 'drivers',
      label: 'Total Drivers',
      value: formatNumber(drivers.length),
      delta: newDriversThisWeek > 0 ? `+${newDriversThisWeek} this week` : 'No new drivers this week',
      trend: newDriversThisWeek > 0 ? 'up' : 'flat',
      icon: 'users',
      color: 'green',
    },
    {
      id: 'passengers',
      label: 'Total Passengers',
      value: formatNumber(users.length),
      delta: newUsersThisWeek > 0 ? `+${newUsersThisWeek} this week` : 'No new passengers this week',
      trend: newUsersThisWeek > 0 ? 'up' : 'flat',
      icon: 'user',
      color: 'orange',
    },
    {
      id: 'trips',
      label: 'Total Trips',
      value: formatNumber(rides.length),
      delta: tripsToday > 0 ? `+${tripsToday} today` : 'No trips today',
      trend: tripsToday > 0 ? 'up' : 'flat',
      icon: 'car',
      color: 'blue',
    },
    {
      id: 'earnings',
      label: 'Total Earnings',
      value: formatNaira(totalEarnings),
      delta: earningsDelta,
      trend: earningsTrend,
      icon: 'wallet',
      color: 'purple',
    },
    {
      id: 'pending',
      label: 'Pending Trips',
      value: formatNumber(pendingCount),
      delta: 'View all',
      trend: 'link',
      icon: 'clock',
      color: 'amber',
    },
    {
      id: 'cancelled',
      label: 'Cancelled Trips',
      value: formatNumber(cancelledCount),
      delta: 'View all',
      trend: 'link',
      icon: 'xCircle',
      color: 'red',
    },
  ];

  // --- Earnings overview (current week, Mon-Sun) ---
  const weekBuckets = [1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
    const dayDate = new Date(thisWeekStart);
    const offset = dayIndex === 0 ? 6 : dayIndex - 1;
    dayDate.setDate(thisWeekStart.getDate() + offset);
    const nextDay = new Date(dayDate);
    nextDay.setDate(dayDate.getDate() + 1);
    const value = completedRides
      .filter((r) => {
        const at = new Date(r.completed_at || r.requested_at || 0);
        return at >= dayDate && at < nextDay;
      })
      .reduce((sum, r) => sum + (r.final_fare || 0), 0);
    return { day: DAY_LABELS[dayIndex], value };
  });

  // --- Trips overview donut ---
  const total = rides.length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  const tripsOverview = {
    total,
    segments: [
      { label: 'Completed', count: completedRides.length, percent: pct(completedRides.length), color: '#16A34A' },
      { label: 'Ongoing', count: activeCount, percent: pct(activeCount), color: '#2563EB' },
      { label: 'Cancelled', count: cancelledCount, percent: pct(cancelledCount), color: '#F97316' },
    ],
  };

  // --- Recent trips ---
  const driversById = new Map(drivers.map((d) => [String(d.id), d]));
  const usersById = new Map(users.map((u) => [String(u.id), u]));

  const recentTrips: RecentTripRow[] = [...rides]
    .sort((a, b) => new Date(b.requested_at || 0).getTime() - new Date(a.requested_at || 0).getTime())
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      driver: r.driver_ref ? driversById.get(r.driver_ref)?.display_name || 'Unassigned driver' : 'Unassigned',
      passenger: r.passenger_ref ? usersById.get(r.passenger_ref)?.display_name || 'Unknown passenger' : 'Unknown',
      from: shortenAddress(r.pickup_address),
      to: shortenAddress(r.dropoff_address),
      fare: formatNaira(r.final_fare || 0),
      status: statusLabel(r.status),
      statusCategory: statusCategory(r.status),
      time: formatTime(r.requested_at),
      requestedAt: new Date(r.requested_at || 0).getTime(),
    }));

  // --- Pending driver approvals ---
  const pendingDriverApprovals: PendingApprovalRow[] = drivers
    .filter((d) => (d.verification_status || 'pending').toLowerCase() === 'pending')
    .sort((a, b) => new Date(b.created_time || 0).getTime() - new Date(a.created_time || 0).getTime())
    .slice(0, 6)
    .map((d) => ({
      id: String(d.id),
      name: d.display_name || d.phone_number || 'Unnamed driver',
      vehicle: d.car_model?.trim() || 'No vehicle on file',
      applied: formatDate(d.created_time),
    }));

  return { statCards, earningsOverview: weekBuckets, tripsOverview, recentTrips, pendingDriverApprovals, liveTripsCount };
}
