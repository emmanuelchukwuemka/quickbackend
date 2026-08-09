import type { ApiWalletTransaction } from './api';

export interface DailyWalletPoint {
  day: string;
  value: number;
}

// Daily totals for the last `days` days (oldest first), for a given
// transaction type. Mirrors buildDailyEarnings' bucketing shape so it can
// reuse the same chart component.
export function buildDailyWalletSeries(transactions: ApiWalletTransaction[], type: 'topup' | 'commission', days: number): DailyWalletPoint[] {
  const matching = transactions.filter((t) => t.type === type);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets: DailyWalletPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = new Date(today);
    dayStart.setDate(today.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    const value = matching
      .filter((t) => {
        const at = new Date(t.created_at || 0);
        return at >= dayStart && at < dayEnd;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

    buckets.push({ day: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value });
  }
  return buckets;
}
