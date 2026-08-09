import { useEffect, useState } from 'react';
import {
  fetchDriverById,
  fetchDriverRideHistory,
  fetchDriverWalletTransactions,
  type ApiDriver,
  type ApiRide,
  type ApiWalletTransaction,
} from '../lib/api';

export interface DriverDetailData {
  driver: ApiDriver;
  rides: ApiRide[];
  transactions: ApiWalletTransaction[];
  tripsCompleted: number;
  totalEarned: number;
  totalCommission: number;
}

interface State {
  loading: boolean;
  error: string | null;
  data: DriverDetailData | null;
}

export function useDriverDetail(id: string | undefined) {
  const [state, setState] = useState<State>({ loading: true, error: null, data: null });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const [driver, rides, transactions] = await Promise.all([
          fetchDriverById(id!),
          fetchDriverRideHistory(id!),
          fetchDriverWalletTransactions(id!),
        ]);
        if (cancelled) return;

        const completed = rides.filter((r) => r.status.toLowerCase() === 'completed');
        const tripsCompleted = completed.length;
        const totalEarned = completed.reduce((sum, r) => sum + (r.final_fare || 0), 0);
        const totalCommission = transactions
          .filter((t) => t.type === 'commission')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        setState({ loading: false, error: null, data: { driver, rides, transactions, tripsCompleted, totalEarned, totalCommission } });
      } catch (err) {
        if (cancelled) return;
        setState({ loading: false, error: err instanceof Error ? err.message : 'Failed to load driver', data: null });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  return { ...state, refetch: () => setRefreshKey((k) => k + 1) };
}
