import { useState } from 'react';
import Panel from '../components/Panel';
import StatusBadge from '../components/StatusBadge';
import AsyncState from '../components/AsyncState';
import { useApiList } from '../hooks/useApiList';
import { fetchComplaints, updateComplaint, type ApiComplaint } from '../lib/api';
import { formatDate } from '../lib/format';

const STATUS_TONE: Record<ApiComplaint['status'], 'amber' | 'blue' | 'green'> = {
  open: 'amber',
  in_progress: 'blue',
  resolved: 'green',
};

const STATUS_LABEL: Record<ApiComplaint['status'], string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export default function Complaints() {
  const { loading, error, data, refetch } = useApiList(fetchComplaints);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleStatusChange(id: string, status: ApiComplaint['status']) {
    setUpdatingId(id);
    try {
      await updateComplaint(id, { status });
      await refetch();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <AsyncState loading={loading} error={error} data={data} loadingLabel="Loading complaints…">
      {(complaints) => (
        <Panel title={`Complaints (${complaints.length})`}>
          {complaints.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              No complaints filed yet. This list fills up once the rider/driver app adds a "Report a problem" flow that
              posts to <code className="rounded bg-gray-100 px-1">/api/complaints</code>.
            </p>
          ) : (
            <div className="space-y-3">
              {complaints.map((c) => (
                <div key={c.id} className="rounded-lg border border-gray-100 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.subject || 'No subject'}</p>
                      <p className="text-xs text-gray-400">
                        {c.user_role || 'passenger'} · {c.user_ref || 'unknown user'} · {formatDate(c.created_at)}
                      </p>
                    </div>
                    <StatusBadge label={STATUS_LABEL[c.status]} tone={STATUS_TONE[c.status]} />
                  </div>
                  <p className="mb-3 text-sm text-gray-600">{c.message}</p>
                  <div className="flex gap-2">
                    {(['open', 'in_progress', 'resolved'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={updatingId === c.id || c.status === s}
                        onClick={() => handleStatusChange(c.id, s)}
                        className="rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-40"
                      >
                        Mark {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </AsyncState>
  );
}
