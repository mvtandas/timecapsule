import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Dimensions, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { DARK_MAP_STYLE } from '../../constants/mapStyle';
import * as Location from 'expo-location';
import { CapsuleService } from '../../services/capsuleService';
import CapsuleDetailModal from '../../components/CapsuleDetailModal';
import { calculateDistance, formatDistance } from '../../utils/geoUtils';
import { isLocked } from '../../utils/mediaUtils';
import { COLORS, font } from '../../constants/theme';
import { capColor } from '../../constants/capTypes';
import { useT } from '../../i18n';

const { width, height } = Dimensions.get('window');

type ExploreFilter = 'All' | 'Unlocked' | 'Locked' | 'Travel' | 'Family' | 'Friends' | 'Events' | 'Personal';

const EXPLORE_FILTERS: ExploreFilter[] = ['All', 'Unlocked', 'Locked', 'Travel', 'Family', 'Friends', 'Events', 'Personal'];

interface ExploreScreenProps {
  onNavigate: (screen: string) => void;
}

const RADIUS_KM = 50; // 50km radius to view capsules

const ExploreScreen = ({ onNavigate }: ExploreScreenProps) => {
  const t = useT();
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nearbyCapsules, setNearbyCapsules] = useState<any[]>([]);
  const [selectedCapsule, setSelectedCapsule] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [mapView, setMapView] = useState<'standard' | 'satellite'>('standard');
  const [activeFilter, setActiveFilter] = useState<ExploreFilter>('All');
  const [locationDenied, setLocationDenied] = useState(false);

  const filteredNearbyCapsules = useMemo(() => {
    if (activeFilter === 'All') return nearbyCapsules;
    if (activeFilter === 'Unlocked') return nearbyCapsules.filter((c) => !isLocked(c.open_at));
    if (activeFilter === 'Locked') return nearbyCapsules.filter((c) => isLocked(c.open_at));
    // Category filters - match against capsule category field or title
    const category = activeFilter.toLowerCase();
    return nearbyCapsules.filter(
      (c) =>
        (c.category && c.category.toLowerCase() === category) ||
        (c.title && c.title.toLowerCase().includes(category))
    );
  }, [nearbyCapsules, activeFilter]);

  useEffect(() => {
    loadLocation();
  }, []);

  const loadLocation = async () => {
    try {
      setLoading(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationDenied(true);
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);

      // Load nearby capsules
      const { data, error } = await CapsuleService.getNearbyCapsules(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
        RADIUS_KM
      );

      if (!error && data) {
        const capsulesWithDistance = data
          .filter((capsule: any) => capsule.lat != null && capsule.lng != null)
          .map((capsule: any) => ({
            ...capsule,
            distance: calculateDistance(
              currentLocation.coords.latitude,
              currentLocation.coords.longitude,
              capsule.lat,
              capsule.lng
            ),
          })).sort((a: any, b: any) => a.distance - b.distance);

        setNearbyCapsules(capsulesWithDistance);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading location:', error);
      Alert.alert(t('explore.alert_error_title'), t('explore.alert_load_location_msg'));
    } finally {
      setLoading(false);
    }
  };

  const loadPublicCapsules = async () => {
    try {
      setLoading(true);
      const { data, error } = await CapsuleService.getAllAccessibleCapsules();
      if (!error && data) {
        const publicCapsules = data.filter((c: any) => c.is_public && c.lat && c.lng);
        setNearbyCapsules(publicCapsules);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading public capsules:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRandomIcon = () => {
    const icons = ['🏖️', '👨‍👩‍👧‍👦', '🎓', '🎉', '🎂', '🌴', '🎸', '📸', '✈️', '🎨'];
    return icons[Math.floor(Math.random() * icons.length)];
  };

  const handleCapsuleTap = (capsule: any) => {
    if (!location) return;
    const distance = calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      capsule.lat,
      capsule.lng
    );

    if (distance > 5) {
      Alert.alert(
        t('explore.alert_too_far_title'),
        t('explore.alert_too_far_msg', { distance: formatDistance(distance) })
      );
      return;
    }

    // Check if capsule is unlocked
    if (capsule.open_at) {
      const openDate = new Date(capsule.open_at);
      if (openDate > new Date()) {
        Alert.alert(
          t('explore.alert_locked_title'),
          t('explore.alert_locked_msg', { date: openDate.toLocaleDateString() })
        );
        return;
      }
    }

    // Capsule can be opened - show detail modal
    setSelectedCapsule(capsule);
    setShowDetailModal(true);

    // Increment view count
    CapsuleService.incrementViewCount(capsule.id);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('explore.header_title')}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => onNavigate('Search')} style={styles.refreshButton}>
            <Ionicons name="search" size={24} color={COLORS.ember} />
          </TouchableOpacity>
          <TouchableOpacity onPress={loadLocation} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color={COLORS.ember} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMapView(mapView === 'standard' ? 'satellite' : 'standard')}
            style={[styles.mapToggle, mapView === 'satellite' && styles.mapToggleActive]}
          >
            <Ionicons
              name={mapView === 'satellite' ? 'earth' : 'layers-outline'}
              size={24}
              color={mapView === 'satellite' ? COLORS.white : COLORS.ember}
            />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.ember} />
          <Text style={styles.loadingText}>{t('explore.finding_nearby')}</Text>
        </View>
      ) : !location ? (
        <View style={styles.errorContainer}>
          <Ionicons name="location-outline" size={80} color={COLORS.ember} />
          <Text style={styles.errorTitle}>
            {locationDenied ? t('explore.location_denied_title') : t('explore.location_unavailable_title')}
          </Text>
          <Text style={styles.errorText}>
            {locationDenied
              ? t('explore.location_denied_text')
              : t('explore.location_unavailable_text')}
          </Text>
          <TouchableOpacity
            onPress={locationDenied ? () => Linking.openSettings() : loadLocation}
            style={styles.retryButton}
            accessibilityRole="button"
            accessibilityLabel={locationDenied ? t('explore.open_settings') : t('common.retry')}
          >
            <Text style={styles.retryButtonText}>
              {locationDenied ? t('explore.open_settings') : t('common.retry')}
            </Text>
          </TouchableOpacity>
          {locationDenied && (
            <TouchableOpacity onPress={loadPublicCapsules} style={styles.browsePublicButton}>
              <Ionicons name="globe-outline" size={20} color={COLORS.ember} />
              <Text style={styles.browsePublicButtonText}>{t('explore.browse_public')}</Text>
            </TouchableOpacity>
          )}
          {locationDenied && nearbyCapsules.length > 0 && (
            <ScrollView style={styles.publicCapsulesList}>
              <Text style={styles.publicCapsulesTitle}>
                {t('explore.public_caps_title', { count: nearbyCapsules.length })}
              </Text>
              {nearbyCapsules.map((capsule) => (
                <TouchableOpacity
                  key={capsule.id}
                  style={styles.publicCapsuleItem}
                  onPress={() => {
                    setSelectedCapsule(capsule);
                    setShowDetailModal(true);
                  }}
                >
                  <Ionicons name="time-outline" size={24} color={COLORS.ember} />
                  <View style={styles.publicCapsuleInfo}>
                    <Text style={styles.publicCapsuleName} numberOfLines={1}>{capsule.title}</Text>
                    <Text style={styles.publicCapsuleStatus}>
                      {isLocked(capsule.open_at) ? t('explore.status_locked') : t('explore.status_unlocked')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.text3} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      ) : (
        <>
          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterChipsContainer}
            contentContainerStyle={styles.filterChipsContent}
          >
            {EXPLORE_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[styles.filterChipText, activeFilter === filter && styles.filterChipTextActive]}>
                  {t(`explore.filter_${filter.toLowerCase()}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Map View */}
          <MapView
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            customMapStyle={DARK_MAP_STYLE}
            style={styles.map}
            mapType={mapView}
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.5,
              longitudeDelta: 0.5,
            }}
            showsUserLocation
            showsMyLocationButton
          >
            {/* 50km search radius circle */}
            <Circle
              center={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              radius={RADIUS_KM * 1000}
              strokeColor="rgba(232, 99, 58, 0.3)"
              fillColor="rgba(232, 99, 58, 0.05)"
              strokeWidth={2}
            />

            {/* 5km interaction radius circle */}
            <Circle
              center={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              radius={5000}
              strokeColor="rgba(61, 155, 122, 0.5)"
              fillColor="rgba(61, 155, 122, 0.1)"
              strokeWidth={2}
            />

            {/* Capsule Markers */}
            {filteredNearbyCapsules.map((capsule) => {
              const distance = calculateDistance(
                location.coords.latitude,
                location.coords.longitude,
                capsule.lat,
                capsule.lng
              );
              const canInteract = distance <= 5;
              const locked = isLocked(capsule.open_at);

              return (
                <Marker
                  key={capsule.id}
                  coordinate={{
                    latitude: capsule.lat,
                    longitude: capsule.lng,
                  }}
                  pinColor={canInteract ? (locked ? COLORS.danger : capColor(capsule.type)) : COLORS.text3}
                  onPress={() => handleCapsuleTap(capsule)}
                >
                  <Callout>
                    <View style={styles.calloutContainer}>
                      <Text style={styles.calloutTitle}>{capsule.title}</Text>
                      <Text style={styles.calloutDistance}>{t('explore.callout_away', { distance: formatDistance(distance) })}</Text>
                      <Text style={styles.calloutStatus}>
                        {!canInteract
                          ? t('explore.callout_too_far')
                          : locked
                          ? t('explore.callout_locked')
                          : t('explore.callout_can_open')}
                      </Text>
                    </View>
                  </Callout>
                </Marker>
              );
            })}
          </MapView>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.moss }]} />
              <Text style={styles.legendText}>{t('explore.legend_can_open')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} />
              <Text style={styles.legendText}>{t('explore.legend_locked')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.text3 }]} />
              <Text style={styles.legendText}>{t('explore.legend_too_far')}</Text>
            </View>
            <Text style={styles.capsuleCount}>
              {t(filteredNearbyCapsules.length === 1 ? 'explore.found_count_one' : 'explore.found_count_other', {
                count: filteredNearbyCapsules.length,
                radius: RADIUS_KM,
              })}
              {activeFilter !== 'All'
                ? t('explore.found_count_filter_suffix', { filter: t(`explore.filter_${activeFilter.toLowerCase()}`) })
                : ''}
            </Text>
            {filteredNearbyCapsules.length === 0 && (
              <TouchableOpacity
                style={styles.exploreCtaButton}
                onPress={() => onNavigate('Create')}
                activeOpacity={0.8}
              >
                <Text style={styles.exploreCtaButtonText}>{t('explore.create_cap_here')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      <CapsuleDetailModal
        visible={showDetailModal}
        capsule={selectedCapsule}
        capsules={nearbyCapsules}
        onClose={() => setShowDetailModal(false)}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  headerTitle: {
    ...font('title'),
    color: COLORS.text,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  refreshButton: {
    padding: 8,
  },
  mapToggle: {
    padding: 8,
    borderRadius: 10,
  },
  mapToggleActive: {
    backgroundColor: COLORS.ember,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.text2,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    ...font('title'),
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.text2,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.ember,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  browsePublicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.ember,
    gap: 8,
  },
  browsePublicButtonText: {
    color: COLORS.ember,
    fontSize: 16,
    fontWeight: '700',
  },
  publicCapsulesList: {
    width: '100%',
    marginTop: 24,
    maxHeight: 300,
  },
  publicCapsulesTitle: {
    ...font('subtitle'),
    color: COLORS.text,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  publicCapsuleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  publicCapsuleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  publicCapsuleName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  publicCapsuleStatus: {
    fontSize: 13,
    color: COLORS.text2,
    marginTop: 2,
  },
  filterChipsContainer: {
    maxHeight: 48,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterChipsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.bg3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.ember,
    borderColor: COLORS.ember,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text2,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  map: {
    flex: 1,
  },
  calloutContainer: {
    padding: 12,
    minWidth: 150,
    backgroundColor: COLORS.card,
    borderRadius: 12,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  calloutDistance: {
    fontSize: 14,
    color: COLORS.text2,
    marginBottom: 4,
  },
  calloutStatus: {
    fontSize: 12,
    color: COLORS.text3,
  },
  infoCard: {
    position: 'absolute',
    bottom: 120, // sit above the floating glass tab bar
    left: 16,
    right: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.text2,
  },
  capsuleCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  exploreCtaButton: {
    backgroundColor: COLORS.ember,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  exploreCtaButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default ExploreScreen;
