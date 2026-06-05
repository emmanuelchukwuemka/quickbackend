import { getDistance } from 'geolib';

/**
 * Calculates straight-line mathematical distance and an estimated ETA.
 * Replace with Google Maps API or Mapbox in production.
 */
export const calculateDistanceAndETA = (
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number }
) => {
  // getDistance returns distance in meters
  const distanceMeters = getDistance(
    { latitude: pickup.lat, longitude: pickup.lng },
    { latitude: dropoff.lat, longitude: dropoff.lng }
  );

  const distanceKm = distanceMeters / 1000;

  // Assuming average city speed is 30 km/h (which is 0.5 km/minute)
  const averageSpeedKmPerMin = 0.5;
  const estimatedMinutes = Math.ceil(distanceKm / averageSpeedKmPerMin);

  return {
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    estimatedMinutes,
  };
};
