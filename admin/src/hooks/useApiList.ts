import { useCallback, useEffect, useState } from 'react';

interface State<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

export function useApiList<T>(fetchFn: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({ loading: true, error: null, data: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchFn();
      setState({ loading: false, error: null, data });
    } catch (err) {
      setState({ loading: false, error: err instanceof Error ? err.message : 'Failed to load data', data: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}
