import { useState, type FormEvent } from 'react';
import Panel from '../components/Panel';
import AsyncState from '../components/AsyncState';
import { useApiList } from '../hooks/useApiList';
import { fetchNotificationLog, sendNotification } from '../lib/api';
import { formatDate, formatTime } from '../lib/format';

export default function Notifications() {
  const { loading, error, data, refetch } = useApiList(fetchNotificationLog);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all_drivers' | 'all_passengers'>('all_passengers');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setResult(null);
    setSending(true);
    try {
      const res = await sendNotification({ title, body, audience });
      setResult(res.message);
      setTitle('');
      setBody('');
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to send notification');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5">
      <Panel title="Send Push Notification">
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Audience</label>
            <div className="flex gap-3">
              {(['all_passengers', 'all_drivers'] as const).map((a) => (
                <label key={a} className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="radio" checked={audience === a} onChange={() => setAudience(a)} />
                  {a === 'all_passengers' ? 'All Passengers' : 'All Drivers'}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              placeholder="Weekend promo!"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Message</label>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              placeholder="Get 20% off rides this weekend."
            />
          </div>
          {formError && <p className="text-xs text-red-500">{formError}</p>}
          {result && <p className="text-xs text-emerald-600">{result}</p>}
          <button
            type="submit"
            disabled={sending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send Notification'}
          </button>
        </form>
      </Panel>

      <AsyncState loading={loading} error={error} data={data} loadingLabel="Loading history…">
        {(log) => (
          <Panel title={`Sent History (${log.length})`}>
            {log.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No notifications sent yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                      <th className="py-2 pr-4 font-medium">Title</th>
                      <th className="py-2 pr-4 font-medium">Audience</th>
                      <th className="py-2 pr-4 font-medium">Recipients</th>
                      <th className="py-2 pr-4 font-medium">Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.map((n) => (
                      <tr key={n.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-gray-700">{n.title}</p>
                          <p className="text-xs text-gray-400">{n.body}</p>
                        </td>
                        <td className="py-3 pr-4 text-gray-600">{n.audience === 'all_drivers' ? 'Drivers' : 'Passengers'}</td>
                        <td className="py-3 pr-4 text-gray-600">{n.recipient_count}</td>
                        <td className="py-3 pr-4 text-gray-500">
                          {formatDate(n.sent_at)} · {formatTime(n.sent_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}
      </AsyncState>
    </div>
  );
}
