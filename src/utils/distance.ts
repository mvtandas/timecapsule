/**
 * Distance calculation utilities using Haversine formula
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CapsuleLocation {
  lat: number;
  lng: number;
}

export const VISIBILITY_RADIUS_KM = 4; // Capsules visible within 4km
export const OPEN_RADIUS_KM = 1; // Capsules can be opened within 1km

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
export const getDistanceInKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Check if capsule is within visibility radius (4km)
 */
export const isWithinViewRadius = (
  userCoords: Coordinates,
  capsuleCoords: CapsuleLocation
): boolean => {
  const distance = getDistanceInKm(
    userCoords.latitude,
    userCoords.longitude,
    capsuleCoords.lat,
    capsuleCoords.lng
  );
  return distance <= VISIBILITY_RADIUS_KM;
};

/**
 * Check if capsule is within opening radius (1km)
 */
export const isWithinOpenRadius = (
  userCoords: Coordinates,
  capsuleCoords: CapsuleLocation
): boolean => {
  const distance = getDistanceInKm(
    userCoords.latitude,
    userCoords.longitude,
    capsuleCoords.lat,
    capsuleCoords.lng
  );
  return distance <= OPEN_RADIUS_KM;
};

/**
 * Get distance status for a capsule
 */
export interface DistanceStatus {
  distance: number; // Distance in km
  withinViewRadius: boolean; // Within 4km
  withinOpenRadius: boolean; // Within 1km
  message: string; // User-friendly message
  canView: boolean; // Can see details
  canOpen: boolean; // Can interact/open
}

export const getDistanceStatus = (
  userCoords: Coordinates,
  capsuleCoords: CapsuleLocation
): DistanceStatus => {
  const distance = getDistanceInKm(
    userCoords.latitude,
    userCoords.longitude,
    capsuleCoords.lat,
    capsuleCoords.lng
  );

  const withinViewRadius = distance <= VISIBILITY_RADIUS_KM;
  const withinOpenRadius = distance <= OPEN_RADIUS_KM;

  let message = '';
  let canView = false;
  let canOpen = false;

  if (withinOpenRadius) {
    message = 'You can open this capsule';
    canView = true;
    canOpen = true;
  } else if (withinViewRadius) {
    message = `You're nearby, but need to be within ${OPEN_RADIUS_KM}km to open this capsule`;
    canView = true;
    canOpen = false;
  } else {
    message = `You're too far (${distance.toFixed(1)}km away). Get closer to reveal this capsule.`;
    canView = false;
    canOpen = false;
  }

  return {
    distance,
    withinViewRadius,
    withinOpenRadius,
    message,
    canView,
    canOpen,
  };
};

/**
 * Format distance for display
 */
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m away`;
  }
  return `${distanceKm.toFixed(1)}km away`;
};

/**
 * Check if user has moved significantly (for optimization)
 * @param oldCoords Previous coordinates
 * @param newCoords New coordinates
 * @param thresholdMeters Minimum distance to consider as "moved" (default 100m)
 * @returns true if user moved more than threshold
 */
export const hasMovedSignificantly = (
  oldCoords: Coordinates,
  newCoords: Coordinates,
  thresholdMeters: number = 100
): boolean => {
  const distanceKm = getDistanceInKm(
    oldCoords.latitude,
    oldCoords.longitude,
    newCoords.latitude,
    newCoords.longitude
  );
  const distanceMeters = distanceKm * 1000;
  return distanceMeters >= thresholdMeters;
};

