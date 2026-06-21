import { Linking, Platform } from 'react-native';

/**
 * Open turn-by-turn directions to a coordinate in the system maps app
 * (Apple Maps on iOS, Google Maps on Android), falling back to a Google Maps
 * web URL. No Mapbox / in-app routing needed.
 */
export async function openDirections(lat: number, lng: number, label = 'Cap'): Promise<void> {
  const ll = `${lat},${lng}`;
  const q = encodeURIComponent(label);
  const primary = Platform.select({
    ios: `maps://?daddr=${ll}&q=${q}`,
    android: `google.navigation:q=${ll}`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${ll}`,
  }) as string;
  const web = `https://www.google.com/maps/dir/?api=1&destination=${ll}`;
  try {
    const ok = await Linking.canOpenURL(primary);
    await Linking.openURL(ok ? primary : web);
  } catch {
    try {
      await Linking.openURL(web);
    } catch {
      // give up silently
    }
  }
}
