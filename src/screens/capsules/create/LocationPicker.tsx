import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
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
  const region = value
    ? { latitude: value.lat, longitude: value.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : { ...DEFAULT, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  const reverse = async (lat: number, lng: number): Promise<string | undefined> => {
    try {
      const r = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const p: any = r?.[0];
      return [p?.name, p?.street, p?.city].filter(Boolean).slice(0, 2).join(', ') || undefined;
    } catch { return undefined; }
  };
  const setPoint = async (lat: number, lng: number) => { const name = await reverse(lat, lng); onChange({ lat, lng, name }); };
  const useMine = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') { const loc = await Location.getCurrentPositionAsync({}); await setPoint(loc.coords.latitude, loc.coords.longitude); }
    } catch { /* ignore */ }
  };

  return (
    <View>
      <View style={styles.mapWrap}>
        <MapView
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          customMapStyle={DARK_MAP_STYLE}
          style={StyleSheet.absoluteFill}
          region={region}
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
  mapWrap: { height: 220, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  myLoc: { position: 'absolute', top: SPACING.sm, right: SPACING.sm, width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  name: { ...font('caption'), marginTop: SPACING.sm },
});

export default LocationPicker;
