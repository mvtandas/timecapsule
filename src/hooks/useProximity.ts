import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { calculateDistance } from '../utils/geoUtils';

/** Default "you have arrived" radius, in meters. */
export const ARRIVE_RADIUS_M = 60;

/** If no location fix arrives within this window, surface a terminal state
 *  instead of an endless "Locating…" (watchPositionAsync can silently never
 *  fire on the iOS Simulator or any device without a quick GPS fix). */
const FIX_TIMEOUT_MS = 12000;

export interface ProximityState {
  /** Distance from the user to the target, in meters (null until known). */
  distanceM: number | null;
  /** True once within ARRIVE_RADIUS_M (or the provided radius). */
  withinRange: boolean;
  /** Current user coordinates, if available. */
  coords: { latitude: number; longitude: number } | null;
  /** Permission was denied. */
  denied: boolean;
  /** A fix couldn't be obtained (timeout/error) — show a terminal state, not a spinner. */
  unavailable: boolean;
}

const INITIAL: ProximityState = {
  distanceM: null,
  withinRange: false,
  coords: null,
  denied: false,
  unavailable: false,
};

/**
 * Watches the user's location and reports live distance to a target coordinate.
 * The core Voorcap mechanic: a cap/stop becomes openable only when withinRange.
 * Pass `active=false` to pause watching (e.g. when a sheet is closed).
 *
 * Robust against "stuck locating": seeds an immediate one-shot fix (which has a
 * built-in timeout), then attaches a live watcher, and falls back to an
 * `unavailable` terminal state if no fix lands within FIX_TIMEOUT_MS.
 */
export function useProximity(
  target: { lat?: number | null; lng?: number | null } | null | undefined,
  active = true,
  radiusM = ARRIVE_RADIUS_M,
): ProximityState {
  const [state, setState] = useState<ProximityState>(INITIAL);
  const subRef = useRef<Location.LocationSubscription | null>(null);

  const lat = target?.lat ?? null;
  const lng = target?.lng ?? null;

  useEffect(() => {
    let cancelled = false;
    let gotFix = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const stop = () => {
      subRef.current?.remove();
      subRef.current = null;
      if (timer) { clearTimeout(timer); timer = null; }
    };

    if (!active || lat == null || lng == null) {
      stop();
      return;
    }

    // Reset for a fresh target (avoids showing a stale distance when switching stops).
    setState(INITIAL);

    const apply = (latitude: number, longitude: number) => {
      gotFix = true;
      const distanceM = calculateDistance(latitude, longitude, lat, lng) * 1000;
      setState({
        distanceM,
        withinRange: distanceM <= radiusM,
        coords: { latitude, longitude },
        denied: false,
        unavailable: false,
      });
    };

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setState((s) => ({ ...s, denied: true }));
          return;
        }

        // Terminal fallback if nothing ever arrives.
        timer = setTimeout(() => {
          if (!cancelled && !gotFix) setState((s) => ({ ...s, unavailable: true }));
        }, FIX_TIMEOUT_MS);

        // Immediate one-shot fix (has its own timeout, unlike the watcher).
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (cancelled) return;
          apply(loc.coords.latitude, loc.coords.longitude);
        } catch {
          // fall through to the watcher / timeout
        }

        // Live updates.
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 5, timeInterval: 4000 },
          (loc) => { if (!cancelled) apply(loc.coords.latitude, loc.coords.longitude); },
        );
        // The effect may have been cleaned up while the watch was being set up —
        // if so, remove the now-live subscription instead of leaking it.
        if (cancelled) { sub.remove(); return; }
        subRef.current = sub;
      } catch {
        if (!cancelled) setState((s) => ({ ...s, unavailable: true }));
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [lat, lng, active, radiusM]);

  return state;
}
