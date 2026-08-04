import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Panel from '../components/Panel';
import StatusBadge from '../components/StatusBadge';
import AsyncState from '../components/AsyncState';
import { useApiList } from '../hooks/useApiList';
import { createPromoCode, deletePromoCode, fetchPromoCodes, updatePromoCode, type ApiPromoCode } from '../lib/api';
import { formatDate } from '../lib/format';

function statusOf(promo: ApiPromoCode): { label: string; tone: 'green' | 'red' | 'gray' } {
  if (!promo.is_active) return { label: 'Inactive', tone: 'gray' };
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) return { label: 'Expired', tone: 'red' };
  if (promo.max_uses != null && promo.uses_count >= promo.max_uses) return { label: 'Exhausted', tone: 'red' };
  return { label: 'Active', tone: 'green' };
}

export default function PromoCodes() {
  const { loading, error, data, refetch } = useApiList(fetchPromoCodes);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await createPromoCode({
        code,
        description,
        discount_type: discountType,
        discount_value: Number(discountValue),
        max_uses: maxUses ? Number(maxUses) : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      setCode('');
      setDescription('');
      setDiscountValue('');
      setMaxUses('');
      setExpiresAt('');
      setShowForm(false);
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create promo code');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(promo: ApiPromoCode) {
    await updatePromoCode(promo.id, { is_active: !promo.is_active });
    await refetch();
  }

  async function handleDelete(id: string) {
    await deletePromoCode(id);
    await refetch();
  }

  return (
    <AsyncState loading={loading} error={error} data={data} loadingLabel="Loading promo codes…">
      {(codes) => (
        <div className="space-y-5">
          <Panel
            title={`Promo Codes (${codes.length})`}
            action={
              <button
                type="button"
                onClick={() => setShowForm((s) => !s)}
                className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                <Plus size={13} />
                New Code
              </button>
            }
          >
            {showForm && (
              <form onSubmit={handleCreate} className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Code</label>
                  <input
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="WELCOME10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Description</label>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="10% off first ride"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Discount</label>
                  <div className="flex gap-2">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
                      className="rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="percent">%</option>
                      <option value="fixed">₦</option>
                    </select>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Max uses (optional)</label>
                  <input
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Expires (optional)</label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {submitting ? 'Creating…' : 'Create'}
                  </button>
                </div>
                {formError && <p className="col-span-full text-xs text-red-500">{formError}</p>}
              </form>
            )}

            {codes.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No promo codes yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                      <th className="py-2 pr-4 font-medium">Code</th>
                      <th className="py-2 pr-4 font-medium">Discount</th>
                      <th className="py-2 pr-4 font-medium">Uses</th>
                      <th className="py-2 pr-4 font-medium">Expires</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map((promo) => {
                      const status = statusOf(promo);
                      return (
                        <tr key={promo.id} className="border-b border-gray-50 last:border-0">
                          <td className="py-3 pr-4">
                            <p className="font-medium text-gray-700">{promo.code}</p>
                            <p className="text-xs text-gray-400">{promo.description}</p>
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {promo.discount_type === 'percent' ? `${promo.discount_value}%` : `₦${promo.discount_value}`}
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {promo.uses_count}
                            {promo.max_uses != null ? ` / ${promo.max_uses}` : ''}
                          </td>
                          <td className="py-3 pr-4 text-gray-500">{promo.expires_at ? formatDate(promo.expires_at) : 'Never'}</td>
                          <td className="py-3 pr-4">
                            <StatusBadge label={status.label} tone={status.tone} />
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => toggleActive(promo)}
                                className="rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                              >
                                {promo.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(promo.id)}
                                className="flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}
    </AsyncState>
  );
}
