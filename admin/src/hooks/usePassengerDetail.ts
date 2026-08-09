import { useEffect, useState } from 'react';
import { fetchUserById, fetchUserRideHistory, type ApiRide, type ApiUser } from '../lib/api';

export interface PassengerDetailData {
  passenger: ApiUser;
  rides: ApiRide[];
  tripsCompleted: number;
  totalSpent: number;
}

interface State {
  loading: boolean;
  error: string | null;
  data: PassengerDetailData | null;
}

export function usePassengerDetail(id: string | undefined) {
  const [state, setState] = useState<State>({ loading: true, error: null, data: null });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const [passenger, rides] = await Promise.all([fetchUserById(id!), fetchUserRideHistory(id!)]);
        if (cancelled) return;

        const completed = rides.filter((r) => r.status.toLowerCase() === 'completed');
        const tripsCompleted = completed.length;
        const totalSpent = completed.reduce((sum, r) => sum + (r.final_fare || 0), 0);

        setState({ loading: false, error: null, data: { passenger, rides, tripsCompleted, totalSpent } });
      } catch (err) {
        if (cancelled) return;
        setState({ loading: false, error: err instanceof Error ? err.message : 'Failed to load passenger', data: null });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  return { ...state, refetch: () => setRefreshKey((k) => k + 1) };
}
