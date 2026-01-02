/**
 * Geo-fencing utility functions for mobile app
 */

interface Location {
  latitude: number;
  longitude: number;
}

interface OfficeLocation extends Location {
  _id?: string;
  name: string;
  address?: string;
  radius: number;
}

export interface GeofenceResult {
  isWithin: boolean;
  nearestOffice: string | null;
  nearestOfficeId: string | null;
  distanceMeters: number;
  allowedRadius: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const EARTH_RADIUS_METERS = 6371000; // Earth's radius in meters

  // Convert degrees to radians
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Check if a location is within any of the geo-fenced office locations
 * @param employeeLocation The employee's current location
 * @param officeLocations Array of office locations with their geo-fence radius
 * @param defaultRadius Default radius to use if location doesn't have one
 * @returns GeofenceResult with validation details
 */
export function isWithinGeofence(
  employeeLocation: Location,
  officeLocations: OfficeLocation[],
  defaultRadius: number = 100
): GeofenceResult {
  if (!officeLocations || officeLocations.length === 0) {
    return {
      isWithin: true, // No geo-fence configured, allow check-in
      nearestOffice: null,
      nearestOfficeId: null,
      distanceMeters: 0,
      allowedRadius: 0,
    };
  }

  let nearestOffice: OfficeLocation | null = null;
  let minDistance = Infinity;

  // Find the nearest office and check if within any geo-fence
  for (const office of officeLocations) {
    const distance = calculateDistance(
      employeeLocation.latitude,
      employeeLocation.longitude,
      office.latitude,
      office.longitude
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestOffice = office;
    }

    // Check if within this office's geo-fence
    const radius = office.radius || defaultRadius;
    if (distance <= radius) {
      return {
        isWithin: true,
        nearestOffice: office.name,
        nearestOfficeId: office._id || null,
        distanceMeters: Math.round(distance),
        allowedRadius: radius,
      };
    }
  }

  // Not within any geo-fence
  return {
    isWithin: false,
    nearestOffice: nearestOffice?.name || null,
    nearestOfficeId: nearestOffice?._id || null,
    distanceMeters: Math.round(minDistance),
    allowedRadius: nearestOffice?.radius || defaultRadius,
  };
}

/**
 * Format distance for display
 * @param meters Distance in meters
 * @returns Formatted string (e.g., "150m" or "1.5km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}
