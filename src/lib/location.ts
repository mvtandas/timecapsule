import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

export class LocationService {
  private static locationSubscription: Location.LocationSubscription | null = null;

  // Request location permissions
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === Location.PermissionStatus.GRANTED;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  // Get current location
  static async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        altitudeAccuracy: location.coords.altitudeAccuracy,
        heading: location.coords.heading,
        speed: location.coords.speed,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  // Start watching location changes
  static async startLocationUpdates(
    callback: (location: LocationData) => void
  ): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          if (location) {
            callback({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy,
              altitude: location.coords.altitude,
              altitudeAccuracy: location.coords.altitudeAccuracy,
              heading: location.coords.heading,
              speed: location.coords.speed,
            });
          }
        }
      );

      return true;
    } catch (error) {
      console.error('Error starting location updates:', error);
      return false;
    }
  }

  // Stop watching location changes
  static stopLocationUpdates(): void {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
  }

  // Calculate distance between two points (in meters)
  static calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = φ2 - φ1;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c =
      2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return R * c;
  }

  // Check if user is within a certain radius of a location
  static isWithinRadius(
    userLocation: LocationData,
    targetLocation: { latitude: number; longitude: number },
    radiusMeters: number
  ): boolean {
    const distance = this.calculateDistance(userLocation, targetLocation);
    return distance <= radiusMeters;
  }

  // Get location description from coordinates
  static async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<string | null> {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (results.length > 0) {
        const address = results[0];
        const parts = [
          address.name,
          address.street,
          address.city,
          address.region,
          address.country,
        ].filter(Boolean);

        return parts.join(', ');
      }
      
      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  // Get coordinates from address
  static async geocode(address: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const results = await Location.geocodeAsync(address);
      
      if (results.length > 0) {
        const location = results[0];
        return {
          latitude: location.latitude,
          longitude: location.longitude,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error geocoding:', error);
      return null;
    }
  }

  // Check if location services are enabled
  static async isLocationServicesEnabled(): Promise<boolean> {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      return enabled;
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }

  // Open location settings
  static openLocationSettings(): void {
    if (Platform.OS === 'ios') {
      Location.openAppSettings();
    } else {
      Location.openLocationSettings();
    }
  }
}