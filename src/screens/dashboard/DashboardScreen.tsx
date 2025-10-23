import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, RefreshControl, TextInput, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { CapsuleService } from '../../services/capsuleService';

type Screen = 'Dashboard' | 'MyCapsules' | 'Create' | 'Explore' | 'Profile';

interface DashboardScreenProps {
  onNavigate: (screen: Screen) => void;
  onLogout?: () => void;
}

const { width, height } = Dimensions.get('window');

const DashboardScreen = ({ onNavigate }: DashboardScreenProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState(['Kaside Sokak', 'Çelik Sokak']);
  const [userLocation, setUserLocation] = useState({
    latitude: 40.9887,
    longitude: 29.0241,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [capsules, setCapsules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCapsules();
  }, []);

  const loadCapsules = async () => {
    try {
      setLoading(true);
      const { data, error } = await CapsuleService.getUserCapsules();
      if (error) {
        console.error('Error loading capsules:', error);
      } else {
        setCapsules(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // TODO: Implement search functionality
  };

  const handleCreateCapsule = () => {
    onNavigate('Create');
  };

  const handleMyCapsules = () => {
    onNavigate('MyCapsules');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="menu" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.locationText}>Bonveno süpermarket</Text>
          <View style={styles.lockContainer}>
            <Ionicons name="lock-closed" size={16} color="#94a3b8" />
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.timeText}>10:51</Text>
          <Ionicons name="chevron-up" size={20} color="#1e293b" />
        </View>
      </View>

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={userLocation}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {/* Sample markers for capsules */}
          {capsules.map((capsule, index) => (
            <Marker
              key={capsule.id || index}
              coordinate={{
                latitude: userLocation.latitude + (Math.random() - 0.5) * 0.01,
                longitude: userLocation.longitude + (Math.random() - 0.5) * 0.01,
              }}
              title={capsule.title}
              description={capsule.description}
            >
              <View style={styles.capsuleMarker}>
                <Ionicons name="time" size={20} color="#FAC638" />
              </View>
            </Marker>
          ))}
        </MapView>
        
        {/* Map Controls */}
        <TouchableOpacity style={styles.mapControl}>
          <Ionicons name="navigate" size={24} color="#1e293b" />
        </TouchableOpacity>
      </View>

      {/* Invite Banner */}
      <View style={styles.inviteBanner}>
        <Text style={styles.inviteText}>Invite a friend!</Text>
        <TouchableOpacity style={styles.inviteButton}>
          <Text style={styles.inviteButtonText}>Invite</Text>
        </TouchableOpacity>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where to?"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
        
        {/* Recent Searches */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentSearches}>
          {recentSearches.map((search, index) => (
            <TouchableOpacity key={index} style={styles.recentSearchItem}>
              <Ionicons name="time" size={16} color="#94a3b8" />
              <Text style={styles.recentSearchText}>{search}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Service Cards */}
      <View style={styles.serviceCards}>
        <TouchableOpacity style={styles.serviceCard} onPress={handleCreateCapsule}>
          <View style={styles.serviceCardContent}>
            <View style={styles.serviceIcon}>
              <Ionicons name="time" size={32} color="#FAC638" />
            </View>
            <Text style={styles.serviceTitle}>Create Capsule</Text>
            <Text style={styles.serviceSubtitle}>Create new time capsule</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceCard} onPress={handleMyCapsules}>
          <View style={styles.serviceCardContent}>
            <View style={styles.serviceIcon}>
              <Ionicons name="albums" size={32} color="#06D6A0" />
            </View>
            <Text style={styles.serviceTitle}>My Capsules</Text>
            <Text style={styles.serviceSubtitle}>View your capsules</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>Faster and more comfortable with Time Capsule</Text>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => onNavigate('MyCapsules')} style={styles.navItem}>
          <Ionicons name="albums" size={24} color="#FAC638" />
          <Text style={[styles.navText, styles.navTextActive]}>My Capsules</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onNavigate('Create')} style={styles.navItem}>
          <Ionicons name="add-circle" size={24} color="#94a3b8" />
          <Text style={styles.navText}>Create</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onNavigate('Profile')} style={styles.navItem}>
          <Ionicons name="person" size={24} color="#94a3b8" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#f8f8f5',
  },
  menuButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 8,
  },
  lockContainer: {
    padding: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  mapContainer: {
    height: height * 0.4,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapControl: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  capsuleMarker: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#06D6A0',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  inviteText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  inviteButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  recentSearches: {
    flexDirection: 'row',
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  recentSearchText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
  },
  serviceCards: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  serviceCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceCardContent: {
    alignItems: 'center',
  },
  serviceIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center',
  },
  serviceSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  infoBanner: {
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: 8,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8f8f5',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
  },
  navTextActive: {
    fontWeight: '700',
    color: '#FAC638',
  },
});

export default DashboardScreen;
