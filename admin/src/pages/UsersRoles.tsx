import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import Panel from '../components/Panel';
import StatusBadge from '../components/StatusBadge';
import AsyncState from '../components/AsyncState';
import { useApiList } from '../hooks/useApiList';
import { createAdminUser, fetchAdmins, updateAdminUser } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, initials } from '../lib/format';

const ROLES = ['super_admin', 'support', 'finance', 'operations'] as const;

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  support: 'Support',
  finance: 'Finance',
  operations: 'Operations',
};

export default function UsersRoles() {
  const { admin: me } = useAuth();
  const { loading, error, data, refetch } = useApiList(fetchAdmins);
  const isSuperAdmin = me?.role === 'super_admin';

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number]>('support');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await createAdminUser({ email, password, display_name: displayName, role });
      setEmail('');
      setPassword('');
      setDisplayName('');
      setRole('support');
      setShowForm(false);
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create admin');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(id: string, newRole: string) {
    await updateAdminUser(id, { role: newRole });
    await refetch();
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    await updateAdminUser(id, { is_active: !isActive });
    await refetch();
  }

  return (
    <AsyncState loading={loading} error={error} data={data} loadingLabel="Loading admin users…">
      {(admins) => (
        <Panel
          title={`Admin Users (${admins.length})`}
          action={
            isSuperAdmin ? (
              <button
                type="button"
                onClick={() => setShowForm((s) => !s)}
                className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                <Plus size={13} />
                Invite Admin
              </button>
            ) : undefined
          }
        >
          {!isSuperAdmin && (
            <p className="mb-4 text-xs text-gray-400">Only super admins can invite new admins or change roles.</p>
          )}

          {showForm && isSuperAdmin && (
            <form onSubmit={handleCreate} className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 sm:grid-cols-4">
              <input
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Name"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Temporary password"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
                  className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? '…' : 'Add'}
                </button>
              </div>
              {formError && <p className="col-span-full text-xs text-red-500">{formError}</p>}
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-4 font-medium">Admin</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Last Login</th>
                  {isSuperAdmin && <th className="py-2 pr-4 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                          {initials(a.display_name || a.email)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-700">{a.display_name || 'Unnamed'}</p>
                          <p className="truncate text-xs text-gray-400">{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {isSuperAdmin ? (
                        <select
                          value={a.role}
                          onChange={(e) => handleRoleChange(a.id, e.target.value)}
                          className="rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-600">{ROLE_LABEL[a.role] || a.role}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge label={a.is_active ? 'Active' : 'Inactive'} tone={a.is_active ? 'green' : 'gray'} />
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{a.last_login ? formatDate(a.last_login) : 'Never'}</td>
                    {isSuperAdmin && (
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(a.id, a.is_active ?? true)}
                          className="rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                        >
                          {a.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </AsyncState>
  );
}
