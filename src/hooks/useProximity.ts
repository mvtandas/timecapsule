import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { calculateDistance } from '../utils/geoUtils';

/** Default "you have arrived" radius, in meters. */
export const ARRIVE_RADIUS_M = 60;

export interface ProximityState {
  /** Distance from the user to the target, in meters (null until known). */
  distanceM: number | null;
  /** True once within ARRIVE_RADIUS_M (or the provided radius). */
  withinRange: boolean;
  /** Current user coordinates, if available. */
  coords: { latitude: number; longitude: number } | null;
  /** Permission was denied. */
  denied: boolean;
}

/**
 * Watches the user's location and reports live distance to a target coordinate.
 * The core Voorcap mechanic: a cap/stop becomes openable only when withinRange.
 * Pass `active=false` to pause watching (e.g. when a sheet is closed).
 */
export function useProximity(
  target: { lat?: number | null; lng?: number | null } | null | undefined,
  active = true,
  radiusM = ARRIVE_RADIUS_M,
): ProximityState {
  const [state, setState] = useState<ProximityState>({
    distanceM: null,
    withinRange: false,
    coords: null,
    denied: false,
  });
  const subRef = useRef<Location.LocationSubscription | null>(null);

  const lat = target?.lat ?? null;
  const lng = target?.lng ?? null;

  useEffect(() => {
    let cancelled = false;
    const stop = () => {
      subRef.current?.remove();
      subRef.current = null;
    };

    if (!active || lat == null || lng == null) {
      stop();
      return;
    }

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') {
        setState((s) => ({ ...s, denied: true }));
        return;
      }
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 5, timeInterval: 4000 },
        (loc) => {
          const km = calculateDistance(loc.coords.latitude, loc.coords.longitude, lat, lng);
          const distanceM = km * 1000;
          setState({
            distanceM,
            withinRange: distanceM <= radiusM,
            coords: { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
            denied: false,
          });
        },
      );
      // The effect may have been cleaned up while the watch was being set up —
      // if so, remove the now-live subscription instead of leaking it.
      if (cancelled) { sub.remove(); return; }
      subRef.current = sub;
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [lat, lng, active, radiusM]);

  return state;
}
