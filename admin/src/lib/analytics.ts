import type { ApiDriver, ApiRide, ApiUser } from './api';

export interface SignupPoint {
  day: string;
  drivers: number;
  passengers: number;
}

export interface TripsPoint {
  day: string;
  trips: number;
}

export interface RideTypeSlice {
  label: string;
  count: number;
  percent: number;
}

export interface TopDriver {
  name: string;
  completedTrips: number;
}

function lastNDays(n: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (n - 1 - i));
    return d;
  });
}

function labelFor(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function buildTripsTrend(rides: ApiRide[], days: number): TripsPoint[] {
  return lastNDays(days).map((d) => {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const trips = rides.filter((r) => {
      const at = new Date(r.requested_at || 0);
      return at >= d && at < next;
    }).length;
    return { day: labelFor(d), trips };
  });
}

export function buildSignupTrend(drivers: ApiDriver[], passengers: ApiUser[], days: number): SignupPoint[] {
  return lastNDays(days).map((d) => {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const driverCount = drivers.filter((x) => {
      const at = new Date(x.created_time || 0);
      return at >= d && at < next;
    }).length;
    const passengerCount = passengers.filter((x) => {
      const at = new Date(x.created_time || 0);
      return at >= d && at < next;
    }).length;
    return { day: labelFor(d), drivers: driverCount, passengers: passengerCount };
  });
}

export function buildRideTypeBreakdown(rides: ApiRide[]): RideTypeSlice[] {
  const counts = new Map<string, number>();
  for (const r of rides) {
    const type = (r.ride_type || 'standard').toLowerCase();
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  const total = rides.length || 1;
  return [...counts.entries()]
    .map(([label, count]) => ({ label: label.charAt(0).toUpperCase() + label.slice(1), count, percent: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

export function buildTopDrivers(drivers: ApiDriver[], rides: ApiRide[], limit: number): TopDriver[] {
  const driversById = new Map(drivers.map((d) => [String(d.id), d]));
  const counts = new Map<string, number>();
  for (const r of rides) {
    if (r.status.toLowerCase() !== 'completed' || !r.driver_ref) continue;
    counts.set(r.driver_ref, (counts.get(r.driver_ref) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([driverId, completedTrips]) => ({ name: driversById.get(driverId)?.display_name || 'Unknown driver', completedTrips }))
    .sort((a, b) => b.completedTrips - a.completedTrips)
    .slice(0, limit);
}

export function cancellationRate(rides: ApiRide[]): number {
  if (rides.length === 0) return 0;
  const cancelled = rides.filter((r) => r.status.toLowerCase() === 'cancelled').length;
  return Math.round((cancelled / rides.length) * 100);
}
