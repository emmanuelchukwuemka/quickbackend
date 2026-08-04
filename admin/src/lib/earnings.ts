import type { ApiRide } from './api';

export interface DailyEarning {
  day: string;
  value: number;
}

// Daily earnings for the last `days` days (oldest first), summed from
// completed rides using completed_at (falls back to requested_at).
export function buildDailyEarnings(rides: ApiRide[], days: number): DailyEarning[] {
  const completed = rides.filter((r) => r.status.toLowerCase() === 'completed');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets: DailyEarning[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = new Date(today);
    dayStart.setDate(today.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    const value = completed
      .filter((r) => {
        const at = new Date(r.completed_at || r.requested_at || 0);
        return at >= dayStart && at < dayEnd;
      })
      .reduce((sum, r) => sum + (r.final_fare || 0), 0);

    buckets.push({ day: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value });
  }
  return buckets;
}
