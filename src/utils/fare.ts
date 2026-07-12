export const BASE_FARE_NAIRA = 500;
export const PRICE_PER_KM_NAIRA = 150;

const RIDE_TYPE_MULTIPLIERS: Record<string, number> = {
  standard: 1,
  comfort: 1.3,
  premium: 1.3,
  car: 1,
};

export const normalizeRideType = (rideType?: string) =>
  (rideType || 'standard').toString().trim().toLowerCase();

export const calculateDistanceKm = (
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
) => {
  const lat1 = Number(pickupLat) || 0;
  const lng1 = Number(pickupLng) || 0;
  const lat2 = Number(dropoffLat) || 0;
  const lng2 = Number(dropoffLng) || 0;
  if ((lat1 == 0 && lng1 == 0) || (lat2 == 0 && lng2 == 0)) {
    return 0;
  }

  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const calculateRideFare = (distanceKm: number, rideType?: string) => {
  const safeDistance = Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : 0;
  const multiplier = RIDE_TYPE_MULTIPLIERS[normalizeRideType(rideType)] ?? 1;
  const total = (BASE_FARE_NAIRA + safeDistance * PRICE_PER_KM_NAIRA) * multiplier;
  return Number(total.toFixed(2));
};
