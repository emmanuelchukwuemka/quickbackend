import FareSettings from '../models/FareSettings';

type MultiplierKey = 'standard_multiplier' | 'premium_multiplier' | 'xl_multiplier';

const RIDE_TYPE_MULTIPLIER_KEY: Record<string, MultiplierKey> = {
  standard: 'standard_multiplier',
  comfort: 'premium_multiplier',
  premium: 'premium_multiplier',
  car: 'standard_multiplier',
  xl: 'xl_multiplier',
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

// Reads live fare configuration from the admin-editable fare_settings row
// instead of hardcoded constants.
export const calculateRideFare = async (distanceKm: number, rideType?: string) => {
  const settings = await FareSettings.getSettings();
  const safeDistance = Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : 0;
  const multiplierKey = RIDE_TYPE_MULTIPLIER_KEY[normalizeRideType(rideType)] ?? 'standard_multiplier';
  const multiplier = settings[multiplierKey];
  const total = (settings.base_fare + safeDistance * settings.price_per_km) * multiplier;
  return Number(total.toFixed(2));
};
