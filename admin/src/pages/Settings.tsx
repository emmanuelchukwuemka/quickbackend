import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import Panel from '../components/Panel';
import AsyncState from '../components/AsyncState';
import { useApiList } from '../hooks/useApiList';
import {
  changeOwnPassword,
  createCity,
  createRideOption,
  deleteCity,
  deleteRideOption,
  fetchCities,
  fetchFareSettings,
  fetchRideOptions,
  updateFareSettings,
  updateRideOption,
  type ApiFareSettings,
  type ApiRideOption,
} from '../lib/api';

function FareSettingsSection() {
  const { loading, error, data, refetch } = useApiList(fetchFareSettings);
  const [form, setForm] = useState<Partial<ApiFareSettings>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  function setField(key: keyof ApiFareSettings, value: string) {
    setForm((f) => ({ ...f, [key]: value === '' ? undefined : Number(value) }));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await updateFareSettings(form);
      setSaved(true);
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save fare settings');
    } finally {
      setSubmitting(false);
    }
  }

  const fields: { key: keyof ApiFareSettings; label: string; step?: string }[] = [
    { key: 'base_fare', label: 'Base fare (₦)' },
    { key: 'price_per_km', label: 'Price per km (₦)' },
    { key: 'standard_multiplier', label: 'Standard multiplier', step: '0.1' },
    { key: 'premium_multiplier', label: 'Premium multiplier', step: '0.1' },
    { key: 'xl_multiplier', label: 'XL multiplier', step: '0.1' },
    { key: 'wallet_minimum_balance', label: 'Driver wallet minimum (₦)' },
    { key: 'commission_percent', label: 'Commission (%)', step: '0.1' },
  ];

  return (
    <AsyncState loading={loading} error={error} data={data} loadingLabel="Loading fare settings…">
      {() => (
        <Panel title="Fare & Wallet Settings">
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {fields.map(({ key, label, step }) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">{label}</span>
                <input
                  type="number"
                  step={step || '1'}
                  value={form[key] ?? ''}
                  onChange={(e) => setField(key, e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </label>
            ))}
            <div className="col-span-full flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Save Fare Settings'}
              </button>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              {saved && !formError && <p className="text-xs text-emerald-600">Saved.</p>}
            </div>
          </form>
        </Panel>
      )}
    </AsyncState>
  );
}

function RideOptionsSection() {
  const { loading, error, data, refetch } = useApiList(fetchRideOptions);
  const [type, setType] = useState('');
  const [price, setPrice] = useState('');
  const [features, setFeatures] = useState('');
  const [seats, setSeats] = useState('4');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editFeatures, setEditFeatures] = useState('');
  const [editSeats, setEditSeats] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await createRideOption({ Type: type, price, features, numbersofseats: seats });
      setType('');
      setPrice('');
      setFeatures('');
      setSeats('4');
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create ride option');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteRideOption(id);
    await refetch();
  }

  function startEdit(o: ApiRideOption) {
    setEditingId(o.id);
    setEditPrice(o.price || '');
    setEditFeatures(o.features || '');
    setEditSeats(o.numbersofseats || '');
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    try {
      await updateRideOption(id, { price: editPrice, features: editFeatures, numbersofseats: editSeats });
      setEditingId(null);
      await refetch();
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <AsyncState loading={loading} error={error} data={data} loadingLabel="Loading ride options…">
      {(options) => (
        <Panel title="Ride Options & Pricing">
          <form onSubmit={handleCreate} className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 sm:grid-cols-4">
            <input
              required
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Type (e.g. Standard)"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            <input
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Base price"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            <input
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder="Features"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                placeholder="Seats"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Plus size={13} />
                Add
              </button>
            </div>
            {formError && <p className="col-span-full text-xs text-red-500">{formError}</p>}
          </form>

          {options.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No ride options configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Price</th>
                    <th className="py-2 pr-4 font-medium">Features</th>
                    <th className="py-2 pr-4 font-medium">Seats</th>
                    <th className="py-2 pr-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {options.map((o) => {
                    const isEditing = editingId === o.id;
                    return (
                      <tr key={o.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-3 pr-4 font-medium text-gray-700">{o.Type}</td>
                        {isEditing ? (
                          <>
                            <td className="py-2 pr-4">
                              <input
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2 pr-4">
                              <input
                                value={editFeatures}
                                onChange={(e) => setEditFeatures(e.target.value)}
                                className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2 pr-4">
                              <input
                                value={editSeats}
                                onChange={(e) => setEditSeats(e.target.value)}
                                className="w-16 rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={savingEdit}
                                  onClick={() => saveEdit(o.id)}
                                  className="rounded-md bg-emerald-600 p-1.5 text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="rounded-md bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 pr-4 text-gray-600">₦{o.price}</td>
                            <td className="py-3 pr-4 text-gray-600">{o.features}</td>
                            <td className="py-3 pr-4 text-gray-600">{o.numbersofseats}</td>
                            <td className="py-3 pr-4">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEdit(o)}
                                  className="rounded-md bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(o.id)}
                                  className="rounded-md bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </AsyncState>
  );
}

function CitiesSection() {
  const { loading, error, data, refetch } = useApiList(fetchCities);
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await createCity({ location_name: name, lat: Number(lat) || 0, lng: Number(lng) || 0 });
      setName('');
      setLat('');
      setLng('');
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create city');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteCity(id);
    await refetch();
  }

  return (
    <AsyncState loading={loading} error={error} data={data} loadingLabel="Loading cities…">
      {(cities) => (
        <Panel title="Service Cities">
          <form onSubmit={handleCreate} className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 sm:grid-cols-4">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="City name"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="Latitude"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="Longitude"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus size={13} />
              Add City
            </button>
            {formError && <p className="col-span-full text-xs text-red-500">{formError}</p>}
          </form>

          {cities.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No cities configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="py-2 pr-4 font-medium">City</th>
                    <th className="py-2 pr-4 font-medium">Lat</th>
                    <th className="py-2 pr-4 font-medium">Lng</th>
                    <th className="py-2 pr-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {cities.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4 font-medium text-gray-700">{c.location_name}</td>
                      <td className="py-3 pr-4 text-gray-600">{c.Latlng.lat}</td>
                      <td className="py-3 pr-4 text-gray-600">{c.Latlng.lng}</td>
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="rounded-md bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 size={13} />
                        </button>
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
  );
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await changeOwnPassword({ currentPassword, newPassword });
      setMessage(res.message);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel title="Change My Password">
      <form onSubmit={handleSubmit} className="max-w-sm space-y-3">
        <input
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password (min 8 chars)"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {message && <p className="text-xs text-emerald-600">{message}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </Panel>
  );
}

export default function Settings() {
  return (
    <div className="space-y-5">
      <FareSettingsSection />
      <RideOptionsSection />
      <CitiesSection />
      <ChangePasswordSection />
    </div>
  );
}
