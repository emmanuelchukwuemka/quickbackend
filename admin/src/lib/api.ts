// Thin fetch layer over the backend REST API. Every request goes through
// apiRequest() so the admin JWT (see lib/auth.ts) is attached automatically,
// and a 401 is surfaced as UnauthorizedError so callers can bounce to login.
import { getToken } from './auth';

export class UnauthorizedError extends Error {
  constructor() {
    super('Session expired. Please log in again.');
    this.name = 'UnauthorizedError';
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body) headers['Content-Type'] = 'application/json';

  const res = await fetch(path, { ...options, headers });
  // A 401 only means "your session expired" when we actually sent a token.
  // A request made with no token (e.g. a login attempt) got a 401 for some
  // other reason — most commonly wrong credentials — so let it fall through
  // to the normal error-message path below instead of showing a misleading
  // "session expired" message for what's really just a bad password.
  if (res.status === 401 && token) {
    throw new UnauthorizedError();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `${path} responded ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const get = <T>(path: string) => apiRequest<T>(path);
const post = <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
const put = <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
const del = <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' });

// ── Core entities ──────────────────────────────────────────────────────────

export interface ApiDriver {
  id: string | number;
  uid: string;
  email?: string;
  display_name: string;
  photo_url?: string;
  phone_number?: string;
  created_time?: string;
  is_active?: boolean;
  is_online?: 'Online' | 'Offline';
  verification_status?: 'pending' | 'approved' | 'rejected';
  car_model?: string;
  car_plate?: string;
  total_trips?: number;
  driver_rating?: number;
  wallet_balance?: number;
  fcm_token?: string;
}

export interface ApiUser {
  id: string | number;
  uid: string;
  email?: string;
  display_name: string;
  phone_number?: string;
  created_time?: string;
  is_active?: boolean;
  is_online?: 'Online' | 'Offline';
  wallet_balance?: number;
  numbe_trips?: number;
  fcm_token?: string;
}

export interface ApiRide {
  id: string;
  passenger_ref?: string | null;
  driver_ref?: string | null;
  status: string;
  ride_type?: string;
  payment_method?: string;
  final_fare?: number;
  distanceKm?: number;
  pickup_address?: string;
  dropoff_address?: string;
  requested_at?: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  rating?: number | null;
}

export interface ApiScheduledRide {
  id: string;
  passenger_ref?: string;
  passenger_name?: string;
  passenger_phone?: string;
  driver_ref?: string | null;
  pickup_address?: string;
  dropoff_address?: string;
  estimated_fare?: number;
  scheduled_time?: string;
  status?: string;
  created_at?: string;
}

export const fetchDrivers = () => get<ApiDriver[]>('/api/drivers');
export const fetchUsers = () => get<ApiUser[]>('/api/users');
export const fetchRides = () => get<ApiRide[]>('/api/rides');
export const fetchScheduledRides = () => get<ApiScheduledRide[]>('/api/scheduled-rides');

export const approveDriver = (id: string) => put(`/api/admin/driver/${id}/approve`);
export const rejectDriver = (id: string) => put(`/api/admin/driver/${id}/reject`);
export const suspendDriver = (id: string) => put(`/api/admin/driver/${id}/suspend`);
export const reactivateDriver = (id: string) => put(`/api/admin/driver/${id}/reactivate`);
export const suspendPassenger = (id: string) => put(`/api/admin/passenger/${id}/suspend`);
export const reactivatePassenger = (id: string) => put(`/api/admin/passenger/${id}/reactivate`);

export async function fetchDashboardSource() {
  const [drivers, users, rides] = await Promise.all([fetchDrivers(), fetchUsers(), fetchRides()]);
  return { drivers, users, rides };
}

export async function fetchBookingsSource() {
  const [scheduledRides, drivers] = await Promise.all([fetchScheduledRides(), fetchDrivers()]);
  return { scheduledRides, drivers };
}

// ── Admin auth ───────────────────────────────────────────────────────────

export interface AdminLoginResult {
  token: string;
  admin: import('./auth').AdminProfile;
}

export const loginAdmin = (data: { email: string; password: string }) => post<AdminLoginResult>('/api/admin/auth/login', data);
export const fetchMe = () => get<import('./auth').AdminProfile>('/api/admin/auth/me');
export const changeOwnPassword = (data: { currentPassword: string; newPassword: string }) =>
  post<{ message: string }>('/api/admin/auth/change-password', data);

// ── Admin users (Users & Roles) ─────────────────────────────────────────────

export const fetchAdmins = () => get<import('./auth').AdminProfile[]>('/api/admin/users');
export const createAdminUser = (data: { email: string; password: string; display_name?: string; role?: string }) =>
  post<import('./auth').AdminProfile>('/api/admin/users', data);
export const updateAdminUser = (id: string, data: { role?: string; is_active?: boolean; display_name?: string }) =>
  put<import('./auth').AdminProfile>(`/api/admin/users/${id}`, data);

// ── Promo codes ─────────────────────────────────────────────────────────────

export interface ApiPromoCode {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export const fetchPromoCodes = () => get<ApiPromoCode[]>('/api/admin/promo-codes');
export const createPromoCode = (data: Partial<ApiPromoCode>) => post<ApiPromoCode>('/api/admin/promo-codes', data);
export const updatePromoCode = (id: string, data: Partial<ApiPromoCode>) => put<ApiPromoCode>(`/api/admin/promo-codes/${id}`, data);
export const deletePromoCode = (id: string) => del<{ message: string }>(`/api/admin/promo-codes/${id}`);

// ── Complaints ───────────────────────────────────────────────────────────────

export interface ApiComplaint {
  id: string;
  user_ref?: string;
  user_role?: 'passenger' | 'driver';
  subject?: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  admin_notes?: string;
  created_at: string;
  resolved_at?: string | null;
}

export const fetchComplaints = () => get<ApiComplaint[]>('/api/complaints');
export const updateComplaint = (id: string, data: { status?: string; admin_notes?: string }) =>
  put<ApiComplaint>(`/api/complaints/${id}`, data);

// ── Notifications ────────────────────────────────────────────────────────────

export interface ApiNotificationLog {
  id: string;
  title: string;
  body: string;
  audience: 'all_drivers' | 'all_passengers';
  recipient_count: number;
  sent_by: string;
  sent_at: string;
}

export const fetchNotificationLog = () => get<ApiNotificationLog[]>('/api/admin/notifications');
export const sendNotification = (data: { title: string; body: string; audience: 'all_drivers' | 'all_passengers' }) =>
  post<{ message: string }>('/api/admin/notifications/send', data);

// ── Settings ─────────────────────────────────────────────────────────────────

export interface ApiRideOption {
  id: string;
  Type: string;
  price?: string;
  features?: string;
  numbersofseats?: string;
}

export interface ApiCity {
  id: string;
  location_name: string;
  Latlng: { lat: number; lng: number };
}

export const fetchRideOptions = () => get<ApiRideOption[]>('/api/rideOptions');
export const createRideOption = (data: Partial<ApiRideOption>) => post<ApiRideOption>('/api/admin/settings/ride-options', data);
export const updateRideOption = (id: string, data: Partial<ApiRideOption>) =>
  put<ApiRideOption>(`/api/admin/settings/ride-options/${id}`, data);
export const deleteRideOption = (id: string) => del<{ message: string }>(`/api/admin/settings/ride-options/${id}`);

export const fetchCities = () => get<ApiCity[]>('/api/cities');
export const createCity = (data: { location_name: string; lat: number; lng: number }) =>
  post<ApiCity>('/api/admin/settings/cities', data);
export const deleteCity = (id: string) => del<{ message: string }>(`/api/admin/settings/cities/${id}`);

// ── Fare & wallet settings ───────────────────────────────────────────────────

export interface ApiFareSettings {
  id: string;
  base_fare: number;
  price_per_km: number;
  standard_multiplier: number;
  premium_multiplier: number;
  xl_multiplier: number;
  wallet_minimum_balance: number;
  commission_percent: number;
  updated_at?: string;
}

export const fetchFareSettings = () => get<ApiFareSettings>('/api/admin/fare-settings');
export const updateFareSettings = (data: Partial<ApiFareSettings>) =>
  put<ApiFareSettings>('/api/admin/fare-settings', data);

// ── Admin alerts (system-generated, e.g. new driver applications) ──────────

export interface ApiAdminAlert {
  id: string;
  type: 'driver_application' | 'wallet_topup_claim' | 'complaint';
  title: string;
  message?: string;
  related_type?: string;
  related_id?: string;
  is_read: boolean;
  created_at: string;
}

export const fetchAdminAlerts = () => get<{ notifications: ApiAdminAlert[]; unreadCount: number }>('/api/admin/alerts');
export const markAdminAlertRead = (id: string) => put<{ message: string }>(`/api/admin/alerts/${id}/read`);
export const markAllAdminAlertsRead = () => put<{ message: string }>('/api/admin/alerts/read-all');
