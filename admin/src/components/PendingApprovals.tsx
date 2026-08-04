import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { PendingApprovalRow } from '../lib/dashboardStats';
import { approveDriver, rejectDriver } from '../lib/api';
import { initials } from '../lib/format';

interface PendingApprovalsProps {
  approvals: PendingApprovalRow[];
  onActionComplete: () => void;
}

export default function PendingApprovals({ approvals, onActionComplete }: PendingApprovalsProps) {
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setActingId(id);
    setError(null);
    try {
      await (action === 'approve' ? approveDriver(id) : rejectDriver(id));
      onActionComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} driver`);
    } finally {
      setActingId(null);
    }
  }

  if (approvals.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No pending driver applications.</p>;
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-red-500">{error}</p>}
      {approvals.map((d) => {
        const busy = actingId === d.id;
        return (
          <div key={d.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                {initials(d.name)}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{d.name}</p>
                <p className="text-xs text-gray-400 truncate">{d.vehicle}</p>
                <p className="text-xs text-gray-400">Applied: {d.applied}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleAction(d.id, 'approve')}
                className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Check size={13} />
                Approve
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleAction(d.id, 'reject')}
                className="flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
              >
                <X size={13} />
                Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
