import { useEffect, useState } from 'react';
import { fetchDashboardSource } from '../lib/api';
import { buildDashboardStats, type DashboardStats } from '../lib/dashboardStats';

interface State {
  loading: boolean;
  error: string | null;
  data: DashboardStats | null;
}

export function useDashboardData() {
  const [state, setState] = useState<State>({ loading: true, error: null, data: null });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const { drivers, users, rides } = await fetchDashboardSource();
        if (cancelled) return;
        setState({ loading: false, error: null, data: buildDashboardStats(drivers, users, rides) });
      } catch (err) {
        if (cancelled) return;
        setState({ loading: false, error: err instanceof Error ? err.message : 'Failed to load dashboard data', data: null });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
