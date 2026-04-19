import { EmergencyContact } from "@/data/dummy";

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface NearestContact extends EmergencyContact {
  distance: number; // in kilometers
}

/**
 * Calculate Haversine distance between two points
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get user's current geolocation
 */
export function getUserLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation tidak didukung browser ini"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Watch user's location changes
 */
export function watchUserLocation(
  callback: (location: UserLocation) => void,
  onError?: (error: GeolocationPositionError) => void
): number {
  if (!navigator.geolocation) {
    onError?.(new GeolocationPositionError() as any);
    return -1;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    },
    onError,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1000, // Update every second max
    }
  );
}

/**
 * Find nearest contacts (RS or Polsek) from user location
 */
export function findNearestContacts(
  userLocation: UserLocation,
  contacts: EmergencyContact[],
  limit: number = 3
): NearestContact[] {
  const nearestList = contacts
    .map((contact) => ({
      ...contact,
      distance: calculateDistance(
        userLocation.lat,
        userLocation.lng,
        contact.lat,
        contact.lng
      ),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

  return nearestList;
}

/**
 * Find nearest specific type (RS or Polsek)
 */
export function findNearestByType(
  userLocation: UserLocation,
  contacts: EmergencyContact[],
  type: "Rumah Sakit" | "Polsek",
  limit: number = 3
): NearestContact[] {
  return findNearestContacts(
    userLocation,
    contacts.filter((c) => c.type === type),
    limit
  );
}
