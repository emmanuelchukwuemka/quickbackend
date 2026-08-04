import { Loader2, AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

interface AsyncStateProps<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
  loadingLabel?: string;
  children: (data: T) => ReactNode;
}

export default function AsyncState<T>({ loading, error, data, loadingLabel = 'Loading…', children }: AsyncStateProps<T>) {
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-gray-400">
        <Loader2 size={24} className="mr-2 animate-spin" />
        {loadingLabel}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-red-200 bg-red-50 text-center">
        <AlertTriangle size={24} className="text-red-500" />
        <p className="text-sm font-medium text-red-700">Couldn't load data</p>
        <p className="text-xs text-red-500">{error}</p>
      </div>
    );
  }

  return <>{children(data)}</>;
}
