import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Alert, Linking } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { DARK_MAP_STYLE } from '../../../constants/mapStyle';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { useT } from '../../../i18n';

export interface PickedLocation { lat: number; lng: number; name?: string }

interface Props {
  value: PickedLocation | null;
  onChange: (v: PickedLocation) => void;
  accent?: string;
}

const DEFAULT = { latitude: 41.0082, longitude: 28.9784 }; // Istanbul fallback

/** Tap the map to drop a pin; reverse-geocodes to a place name. */
const LocationPicker: React.FC<Props> = ({ value, onChange, accent = COLORS.ember }) => {
  const t = useT();
  const mapRef = useRef<MapView>(null);
  // Reverse-geocode race guard: only the latest request may apply its label.
  const geoToken = useRef(0);

  // Uncontrolled map: compute the starting camera once so the form's scroll
  // can't fight the controlled `region` prop and snap the map back.
  const initialRegion = useMemo<Region>(() => (
    value
      ? { latitude: value.lat, longitude: value.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }
      : { ...DEFAULT, latitudeDelta: 0.05, longitudeDelta: 0.05 }
  ), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Move the camera imperatively when `value` changes (search / use-my-location
  // / external), instead of re-controlling via the `region` prop.
  useEffect(() => {
    if (value) {
      mapRef.current?.animateToRegion({ latitude: value.lat, longitude: value.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 });
    }
  }, [value?.lat, value?.lng]);

  // On mount, if there's no pin yet, best-effort center on the user — but only
  // if permission was already granted (never prompt) and never fabricate a pin.
  useEffect(() => {
    if (value) return;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        mapRef.current?.animateToRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reverse = async (lat: number, lng: number): Promise<string | undefined> => {
    try {
      const r = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const p: any = r?.[0];
      return [p?.name, p?.street, p?.city].filter(Boolean).slice(0, 2).join(', ') || undefined;
    } catch { return undefined; }
  };
  const setPoint = async (lat: number, lng: number) => {
    setNoResult(false);
    const tok = ++geoToken.current;
    const name = await reverse(lat, lng);
    if (tok !== geoToken.current) return; // a newer pin won the race
    onChange({ lat, lng, name });
  };
  const useMine = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('createFlow.useMyLocation'),
          t('createFlow.locationDenied', { defaultValue: 'Location permission is off. Enable it in Settings to use your current location.' }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('createFlow.openSettings', { defaultValue: 'Open Settings' }), onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      await setPoint(loc.coords.latitude, loc.coords.longitude);
    } catch { /* ignore */ }
  };

  // Forward-geocode a typed address / place name → drop the pin there.
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [noResult, setNoResult] = useState(false);
  const search = async () => {
    const q = query.trim();
    if (!q || searching) return;
    setNoResult(false);
    setSearching(true);
    const tok = ++geoToken.current;
    try {
      const r = await Location.geocodeAsync(q);
      const p: any = r?.[0];
      if (p) {
        const name = await reverse(p.latitude, p.longitude);
        if (tok !== geoToken.current) return; // a newer request won the race
        onChange({ lat: p.latitude, lng: p.longitude, name: name || q });
      } else if (tok === geoToken.current) {
        setNoResult(true);
      }
    } catch {
      if (tok === geoToken.current) setNoResult(true);
    }
    finally { setSearching(false); }
  };

  return (
    <View>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={COLORS.text3} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={(txt) => { setQuery(txt); if (noResult) setNoResult(false); }}
          onSubmitEditing={search}
          returnKeyType="search"
          placeholder={t('createFlow.searchAddress', { defaultValue: 'Search address or place' })}
          placeholderTextColor={COLORS.text3}
        />
        {searching
          ? <ActivityIndicator size="small" color={accent} />
          : !!query.trim() && (
            <TouchableOpacity onPress={search} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('createFlow.searchAddress', { defaultValue: 'Search address or place' })}>
              <Ionicons name="arrow-forward-circle" size={22} color={accent} />
            </TouchableOpacity>
          )}
      </View>
      {noResult && (
        <Text style={styles.noResult}>
          {t('createFlow.searchNoResult', { defaultValue: 'No place found — try a different search or tap the map' })}
        </Text>
      )}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          customMapStyle={DARK_MAP_STYLE}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          onPress={(e) => { const { latitude, longitude } = e.nativeEvent.coordinate; setPoint(latitude, longitude); }}
        >
          {value && <Marker coordinate={{ latitude: value.lat, longitude: value.lng }} pinColor={accent} />}
        </MapView>
        <TouchableOpacity style={styles.myLoc} onPress={useMine} accessibilityRole="button" accessibilityLabel={t('createFlow.useMyLocation')}>
          <Ionicons name="locate" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.name, { color: value ? COLORS.text : COLORS.text3 }]} numberOfLines={1}>
        {value?.name || (value ? t('createFlow.pinnedLocation') : t('createFlow.tapToPlace'))}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, height: 44, marginBottom: SPACING.sm },
  searchInput: { ...font('body'), color: COLORS.text, flex: 1, padding: 0 },
  mapWrap: { height: 220, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  myLoc: { position: 'absolute', top: SPACING.sm, right: SPACING.sm, width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  noResult: { ...font('caption'), color: COLORS.text3, marginBottom: SPACING.sm },
  name: { ...font('caption'), marginTop: SPACING.sm },
});

export default LocationPicker;
