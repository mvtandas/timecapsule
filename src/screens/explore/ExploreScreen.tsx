import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { CapsuleService } from '../../services/capsuleService';
import CapsuleDetailModal from '../../components/CapsuleDetailModal';
import { calculateDistance, formatDistance } from '../../utils/geoUtils';
import { isLocked } from '../../utils/mediaUtils';

const { width, height } = Dimensions.get('window');

type ExploreFilter = 'All' | 'Unlocked' | 'Locked' | 'Travel' | 'Family' | 'Friends' | 'Events' | 'Personal';

const EXPLORE_FILTERS: ExploreFilter[] = ['All', 'Unlocked', 'Locked', 'Travel', 'Family', 'Friends', 'Events', 'Personal'];

interface ExploreScreenProps {
  onNavigate: (screen: string) => void;
  onGoBack?: () => void;
}

const RADIUS_KM = 50; // 50km radius to view capsules

const ExploreScreen = ({ onNavigate }: ExploreScreenProps) => {
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
        const capsulesWithDistance = data.map((capsule: any) => ({
          ...capsule,
          distance: calculateDistance(
            currentLocation.coords.latitude,
            currentLocation.coords.longitude,
            capsule.lat,
            capsule.lng
          ),
        })).sort((a, b) => a.distance - b.distance);

        setNearbyCapsules(capsulesWithDistance);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading location:', error);
      Alert.alert('Error', 'Failed to load location');
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
        'Too Far Away',
        `This capsule is ${formatDistance(distance)} away. You need to be within 5km to open it.`
      );
      return;
    }

    // Check if capsule is unlocked
    if (capsule.open_at) {
      const openDate = new Date(capsule.open_at);
      if (openDate > new Date()) {
        Alert.alert(
          'Locked',
          `This capsule will unlock on ${openDate.toLocaleDateString()}`
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
        <Text style={styles.headerTitle}>Explore Capsules</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={loadLocation} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#FAC638" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMapView(mapView === 'standard' ? 'satellite' : 'standard')}
            style={styles.mapToggle}
          >
            <Ionicons name="layers-outline" size={24} color="#FAC638" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FAC638" />
          <Text style={styles.loadingText}>Finding nearby capsules...</Text>
        </View>
      ) : !location ? (
        <View style={styles.errorContainer}>
          <Ionicons name="location-outline" size={80} color="#FAC638" />
          <Text style={styles.errorTitle}>
            {locationDenied ? 'Location Access Denied' : 'Location Not Available'}
          </Text>
          <Text style={styles.errorText}>
            {locationDenied
              ? 'Location access helps you discover nearby capsules. You can still browse public capsules.'
              : 'Please enable location permissions to explore nearby capsules'}
          </Text>
          <TouchableOpacity onPress={loadLocation} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          {locationDenied && (
            <TouchableOpacity onPress={loadPublicCapsules} style={styles.browsePublicButton}>
              <Ionicons name="globe-outline" size={20} color="#FAC638" />
              <Text style={styles.browsePublicButtonText}>Browse All Public Capsules</Text>
            </TouchableOpacity>
          )}
          {locationDenied && nearbyCapsules.length > 0 && (
            <ScrollView style={styles.publicCapsulesList}>
              <Text style={styles.publicCapsulesTitle}>
                Public Capsules ({nearbyCapsules.length})
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
                  <Ionicons name="time-outline" size={24} color="#FAC638" />
                  <View style={styles.publicCapsuleInfo}>
                    <Text style={styles.publicCapsuleName} numberOfLines={1}>{capsule.title}</Text>
                    <Text style={styles.publicCapsuleStatus}>
                      {isLocked(capsule.open_at) ? 'Locked' : 'Unlocked'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
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
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Map View */}
          <MapView
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
              strokeColor="rgba(250, 198, 56, 0.3)"
              fillColor="rgba(250, 198, 56, 0.05)"
              strokeWidth={2}
            />

            {/* 5km interaction radius circle */}
            <Circle
              center={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              radius={5000}
              strokeColor="rgba(6, 214, 160, 0.5)"
              fillColor="rgba(6, 214, 160, 0.1)"
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
                  pinColor={canInteract ? (locked ? '#FF6B6B' : '#06D6A0') : '#94a3b8'}
                  onPress={() => handleCapsuleTap(capsule)}
                >
                  <Callout>
                    <View style={styles.calloutContainer}>
                      <Text style={styles.calloutTitle}>{capsule.title}</Text>
                      <Text style={styles.calloutDistance}>{formatDistance(distance)} away</Text>
                      <Text style={styles.calloutStatus}>
                        {!canInteract
                          ? '🚫 Too far to open'
                          : locked
                          ? '🔒 Locked'
                          : '🔓 Can open'}
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
              <View style={[styles.legendDot, { backgroundColor: '#06D6A0' }]} />
              <Text style={styles.legendText}>Can open (within 5km, unlocked)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
              <Text style={styles.legendText}>Within 5km but locked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#94a3b8' }]} />
              <Text style={styles.legendText}>Too far (outside 5km)</Text>
            </View>
            <Text style={styles.capsuleCount}>
              Found {filteredNearbyCapsules.length} capsule{filteredNearbyCapsules.length !== 1 ? 's' : ''} within {RADIUS_KM}km
              {activeFilter !== 'All' ? ` (${activeFilter})` : ''}
            </Text>
            {filteredNearbyCapsules.length === 0 && (
              <TouchableOpacity
                style={styles.exploreCtaButton}
                onPress={() => onNavigate('Create')}
                activeOpacity={0.8}
              >
                <Text style={styles.exploreCtaButtonText}>Create a Capsule Here</Text>
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
    backgroundColor: '#f8f8f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
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
    color: '#94a3b8',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#FAC638',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: 'white',
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
    borderColor: '#FAC638',
    gap: 8,
  },
  browsePublicButtonText: {
    color: '#FAC638',
    fontSize: 16,
    fontWeight: '700',
  },
  publicCapsulesList: {
    width: '100%',
    marginTop: 24,
    maxHeight: 300,
  },
  publicCapsulesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  publicCapsuleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 16,
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
    color: '#1e293b',
  },
  publicCapsuleStatus: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  filterChipsContainer: {
    maxHeight: 48,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#FAC638',
    borderColor: '#FAC638',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  map: {
    flex: 1,
  },
  calloutContainer: {
    padding: 8,
    minWidth: 150,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  calloutDistance: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  calloutStatus: {
    fontSize: 12,
    color: '#94a3b8',
  },
  infoCard: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
    color: '#64748b',
  },
  capsuleCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  exploreCtaButton: {
    backgroundColor: '#FAC638',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  exploreCtaButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default ExploreScreen;
