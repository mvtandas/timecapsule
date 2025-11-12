import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Circle, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { CapsuleService } from '../../services/capsuleService';
import { COLORS, GRADIENTS, SHADOWS } from '../../constants/colors';

const { width, height } = Dimensions.get('window');

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
  const [mapView, setMapView] = useState<'standard' | 'satellite'>('standard');

  useEffect(() => {
    loadLocation();
  }, []);

  const loadLocation = async () => {
    try {
      setLoading(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to show nearby capsules.'
        );
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
      console.error('Error loading location:', error);
      Alert.alert('Error', 'Failed to load location');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (deg: number) => deg * (Math.PI / 180);

  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  };

  const getRandomIcon = () => {
    const icons = ['🏖️', '👨‍👩‍👧‍👦', '🎓', '🎉', '🎂', '🌴', '🎸', '📸', '✈️', '🎨'];
    return icons[Math.floor(Math.random() * icons.length)];
  };

  const handleCapsuleTap = (capsule: any) => {
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

    // Capsule can be opened
    Alert.alert(
      capsule.title,
      `Distance: ${formatDistance(distance)}\n\nYou can open this capsule!`
    );
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
          <Ionicons name="location-outline" size={80} color="#cbd5e1" />
          <Text style={styles.errorTitle}>Location Not Available</Text>
          <Text style={styles.errorText}>
            Please enable location permissions to explore nearby capsules
          </Text>
          <TouchableOpacity onPress={loadLocation} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
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
            {nearbyCapsules.map((capsule) => {
              const distance = calculateDistance(
                location.coords.latitude,
                location.coords.longitude,
                capsule.lat,
                capsule.lng
              );
              const canInteract = distance <= 5;
              const isLocked = capsule.open_at && new Date(capsule.open_at) > new Date();

              return (
                <Marker
                  key={capsule.id}
                  coordinate={{
                    latitude: capsule.lat,
                    longitude: capsule.lng,
                  }}
                  pinColor={canInteract ? (isLocked ? '#FF6B6B' : '#06D6A0') : '#94a3b8'}
                  onPress={() => handleCapsuleTap(capsule)}
                >
                  <Callout>
                    <View style={styles.calloutContainer}>
                      <Text style={styles.calloutTitle}>{capsule.title}</Text>
                      <Text style={styles.calloutDistance}>{formatDistance(distance)} away</Text>
                      <Text style={styles.calloutStatus}>
                        {!canInteract
                          ? '🚫 Too far to open'
                          : isLocked
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
              Found {nearbyCapsules.length} capsule{nearbyCapsules.length !== 1 ? 's' : ''} within {RADIUS_KM}km
            </Text>
          </View>
        </>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: COLORS.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
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
    color: COLORS.text.tertiary,
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
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
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
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  calloutDistance: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  calloutStatus: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  infoCard: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 16,
    backgroundColor: COLORS.background.secondary,
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
    color: COLORS.text.secondary,
  },
  capsuleCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
});

export default ExploreScreen;
