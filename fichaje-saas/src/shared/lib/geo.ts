/**
 * Utilidades geoespaciales para fichaje.
 *
 * Fórmula de Haversine para distancia entre dos puntos GPS (metros).
 * Evita depender de librerías pesadas como turf.js en esta fase.
 */

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(a: Coords, b: Coords): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export interface GeofenceCheck {
  distance: number;
  withinFence: boolean;
  reason?: string;
}

export function checkGeofence(
  employeeCoords: Coords,
  location: { latitude: number | null; longitude: number | null; geofence_radius_m: number }
): GeofenceCheck {
  if (location.latitude == null || location.longitude == null) {
    return { distance: 0, withinFence: true, reason: "location-has-no-coords" };
  }
  const distance = haversineMeters(employeeCoords, {
    latitude: location.latitude,
    longitude: location.longitude,
  });
  // Añadimos un margen con la precisión del GPS para no penalizar al empleado
  // si el dispositivo tiene mala señal.
  const effectiveRadius =
    location.geofence_radius_m + Math.min(employeeCoords.accuracy ?? 0, 100);
  return {
    distance,
    withinFence: distance <= effectiveRadius,
  };
}

/**
 * Solicita la posición actual del navegador con timeout y alta precisión.
 * Devuelve null si el usuario deniega o no hay soporte.
 */
export function getCurrentPosition(
  options: PositionOptions = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
): Promise<Coords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      options
    );
  });
}
