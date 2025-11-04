import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, RefreshControl, TextInput, Dimensions, Platform, Animated, PanResponder, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { BlurView } from 'expo-blur';
import { CapsuleService } from '../../services/capsuleService';
import { CapsuleIcon } from '../../components/common/CapsuleIcon';
import { Friend } from '../../types';

type Screen = 'Dashboard' | 'MyCapsules' | 'Create' | 'Explore' | 'Profile' | 'FriendProfile';

interface DashboardScreenProps {
  onNavigate: (screen: Screen, data?: any) => void;
  onLogout?: () => void;
}

const { width, height } = Dimensions.get('window');

const DashboardScreen = ({ onNavigate }: DashboardScreenProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState({
    latitude: 40.9887,
    longitude: 29.0241,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [capsules, setCapsules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCapsule, setSelectedCapsule] = useState<any>(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [lastTappedCapsule, setLastTappedCapsule] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  // Mock friends data
  const [friends, setFriends] = useState<Friend[]>([
    {
      id: '1',
      name: 'Elif Yılmaz',
      username: 'elifyilmaz',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
      friends_since: '2021',
    },
    {
      id: '2',
      name: 'Ahmet Demir',
      username: 'ahmetdemir',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      friends_since: '2022',
    },
    {
      id: '3',
      name: 'Zeynep Kaya',
      username: 'zeynepkaya',
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
      friends_since: '2020',
    },
    {
      id: '4',
      name: 'Mehmet Öztürk',
      username: 'mehmetozturk',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
      friends_since: '2023',
    },
    {
      id: '5',
      name: 'Ayşe Şahin',
      username: 'aysesahin',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
      friends_since: '2021',
    },
  ]);
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView>(null);
  
  // Detail modal bottom sheet animation
  const DETAIL_MODAL_HEIGHT = height * 0.9; // 90% of screen height
  const detailModalTranslateY = useRef(new Animated.Value(DETAIL_MODAL_HEIGHT)).current;
  const detailModalBackdropOpacity = useRef(new Animated.Value(0)).current;

  // Invite modal state and animation
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const INVITE_MODAL_HEIGHT = height * 0.9;
  const inviteModalTranslateY = useRef(new Animated.Value(INVITE_MODAL_HEIGHT)).current;
  const inviteModalBackdropOpacity = useRef(new Animated.Value(0)).current;
  
  // Bottom sheet animation values
  // Bottom sheet now extends to the bottom of the screen
  const COLLAPSED_HEIGHT = height * 0.35; // 35% of screen height
  const EXPANDED_HEIGHT = height * 0.65; // 65% of screen height
  const bottomSheetHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadCapsules();
  }, []);

  // PanResponder for dragging the bottom sheet
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical movements with sufficient movement
        // Prioritize vertical scrolling over horizontal
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderTerminationRequest: () => false, // Don't allow termination
      onPanResponderGrant: () => {
        bottomSheetHeight.setOffset(bottomSheetHeight._value);
        bottomSheetHeight.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const currentHeight = bottomSheetHeight._value + bottomSheetHeight._offset;
        // Invert dy because dragging up should increase height
        const newHeight = Math.max(
          COLLAPSED_HEIGHT,
          Math.min(EXPANDED_HEIGHT, currentHeight - gestureState.dy)
        );
        bottomSheetHeight.setValue(newHeight - bottomSheetHeight._offset);
      },
      onPanResponderRelease: (_, gestureState) => {
        bottomSheetHeight.flattenOffset();
        
        const currentHeight = bottomSheetHeight._value;
        const velocity = gestureState.vy;
        
        // Determine target height based on current position and velocity
        let targetHeight;
        if (Math.abs(velocity) > 0.5) {
          // Fast swipe - use velocity to determine direction
          // Negative velocity means dragging up (expanding)
          targetHeight = velocity < 0 ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
        } else {
          // Slow drag - use current position
          const midPoint = (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2;
          targetHeight = currentHeight > midPoint ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
        }
        
        setIsExpanded(targetHeight === EXPANDED_HEIGHT);
        
        Animated.spring(bottomSheetHeight, {
          toValue: targetHeight,
          useNativeDriver: false,
          tension: 50,
          friction: 8,
        }).start();
      },
    })
  ).current;

  const loadCapsules = async () => {
    try {
      setLoading(true);
      const { data, error } = await CapsuleService.getUserCapsules();
      if (error) {
        console.error('Error loading capsules:', error);
      } else {
        // Generate stable coordinates for each capsule (only once)
        const capsulesWithCoordinates = (data || []).map((capsule, index) => ({
          ...capsule,
          // Use capsule ID to generate consistent coordinates
          displayLat: capsule.lat || (userLocation.latitude + (Math.sin(index) * 0.005)),
          displayLng: capsule.lng || (userLocation.longitude + (Math.cos(index) * 0.005)),
        }));
        setCapsules(capsulesWithCoordinates);
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

  const handleFriendPress = (friend: Friend) => {
    onNavigate('FriendProfile', { friend });
  };

  const formatTimeUntilOpen = (openDate: string | null): string => {
    if (!openDate) return 'No open date set';
    
    const now = new Date();
    const openDateObj = new Date(openDate);
    const diff = openDateObj.getTime() - now.getTime();
    
    if (diff <= 0) return 'Opened';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `Opens in ${days} ${days === 1 ? 'day' : 'days'}, ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    if (hours > 0) {
      return `Opens in ${hours} ${hours === 1 ? 'hour' : 'hours'}, ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    }
    return `Opens in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  };

  const handleCapsuleMarkerPress = (capsule: any) => {
    // First tap: show callout (handled by MapView)
    // Track which capsule was tapped
    setLastTappedCapsule(capsule.id);
  };

  const handleCalloutPress = (capsule: any) => {
    // Tapping "Tap for details" should always open the detail modal
    setSelectedCapsule(capsule);
    setShowTimeModal(true);
    openDetailModal();
  };

  const openDetailModal = () => {
    // Animate modal slide up
    Animated.parallel([
      Animated.spring(detailModalTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(detailModalBackdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDetailModal = () => {
    // Animate modal slide down
    Animated.parallel([
      Animated.spring(detailModalTranslateY, {
        toValue: DETAIL_MODAL_HEIGHT,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(detailModalBackdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowTimeModal(false);
      setSelectedCapsule(null);
      setLastTappedCapsule(null);
    });
  };

  // PanResponder for swipe-down gesture on detail modal
  const detailModalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to downward swipes, more sensitive
        return gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        detailModalTranslateY.setOffset(detailModalTranslateY._value);
        detailModalTranslateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward dragging
        if (gestureState.dy > 0) {
          detailModalTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        detailModalTranslateY.flattenOffset();
        
        const currentTranslate = detailModalTranslateY._value;
        const velocity = gestureState.vy;
        
        // Close if dragged down more than 25% or fast swipe down
        if (currentTranslate > DETAIL_MODAL_HEIGHT * 0.25 || velocity > 0.5) {
          closeDetailModal();
        } else {
          // Snap back to top
          Animated.spring(detailModalTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isMediaShared = (capsule: any): boolean => {
    // Check if capsule allows media sharing (is_public or user in allowed_users)
    // For now, we'll show media if content_refs exists and has items
    return capsule?.content_refs && Array.isArray(capsule.content_refs) && capsule.content_refs.length > 0;
  };

  const getTimeComponents = (openDate: string | null | undefined): { days: number; hours: number; minutes: number; seconds: number } => {
    if (!openDate) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const now = new Date();
    const openDateObj = new Date(openDate);
    const diff = openDateObj.getTime() - now.getTime();
    
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds };
  };

  const isCapsuleLocked = (openDate: string | null | undefined): boolean => {
    if (!openDate) return false;
    const now = new Date();
    const openDateObj = new Date(openDate);
    return openDateObj.getTime() > now.getTime();
  };

  // Invite Modal Functions
  const openInviteModal = () => {
    setShowInviteModal(true);
    Animated.parallel([
      Animated.spring(inviteModalTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(inviteModalBackdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeInviteModal = () => {
    Animated.parallel([
      Animated.spring(inviteModalTranslateY, {
        toValue: INVITE_MODAL_HEIGHT,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(inviteModalBackdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowInviteModal(false);
      setInviteIdentifier('');
    });
  };

  const validateInviteIdentifier = (identifier: string): { isValid: boolean; type: 'email' | 'username' | null; error?: string } => {
    const trimmed = identifier.trim();
    
    if (!trimmed) {
      return { isValid: false, type: null, error: 'Please enter a username or email address' };
    }
    
    // Check if it's an email (contains @)
    if (trimmed.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        return { isValid: false, type: 'email', error: 'Please enter a valid email address' };
      }
      return { isValid: true, type: 'email' };
    }
    
    // Otherwise treat as username
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(trimmed)) {
      return { isValid: false, type: 'username', error: 'Username must be 3-20 characters (letters, numbers, underscores only)' };
    }
    
    return { isValid: true, type: 'username' };
  };

  const handleSendInvite = () => {
    const validation = validateInviteIdentifier(inviteIdentifier);
    
    if (!validation.isValid) {
      Alert.alert('Invalid Input', validation.error || 'Please check your input');
      return;
    }
    
    // TODO: Implement actual invite logic with backend
    // For now, show success message
    const identifierType = validation.type === 'email' ? 'email address' : 'username';
    Alert.alert(
      'Invite Sent!',
      `Invitation sent to ${identifierType}: ${inviteIdentifier.trim()}`,
      [
        { 
          text: 'OK', 
          onPress: () => {
            setInviteIdentifier('');
            closeInviteModal();
          }
        }
      ]
    );
  };

  // PanResponder for swipe-down gesture on invite modal
  const inviteModalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // More sensitive gesture detection
        return gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        inviteModalTranslateY.setOffset(inviteModalTranslateY._value);
        inviteModalTranslateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward dragging
        if (gestureState.dy > 0) {
          inviteModalTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        inviteModalTranslateY.flattenOffset();
        
        const currentTranslate = inviteModalTranslateY._value;
        const velocity = gestureState.vy;
        
        // Close if dragged down more than 25% or fast swipe down
        if (currentTranslate > INVITE_MODAL_HEIGHT * 0.25 || velocity > 0.5) {
          closeInviteModal();
        } else {
          // Snap back to top
          Animated.spring(inviteModalTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const handleCenterOnLocation = async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Location permission is required to center the map on your location. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      // Update user location state
      setUserLocation(newRegion);

      // Animate map to user location
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Error',
        'Unable to get your current location. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Map Section - Full Screen Background */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={userLocation}
          showsUserLocation={true}
          showsMyLocationButton={false}
          moveOnMarkerPress={false}
          zoomEnabled={true}
          scrollEnabled={true}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          {/* Sample markers for capsules */}
          {capsules.map((capsule, index) => {
            // Use stable coordinates - prevent re-calculation on every render
            const markerCoordinate = {
              latitude: capsule.displayLat || capsule.lat || userLocation.latitude,
              longitude: capsule.displayLng || capsule.lng || userLocation.longitude,
            };
            
            return (
            <Marker
                key={`capsule-${capsule.id || index}`}
                identifier={`capsule-${capsule.id || index}`}
                coordinate={markerCoordinate}
                onPress={(e) => {
                  e.stopPropagation();
                  handleCapsuleMarkerPress(capsule);
                }}
                tracksViewChanges={false}
                stopPropagation={true}
                flat={true}
            >
              <View style={styles.capsuleMarker}>
                  <View style={styles.capsulePill}>
                    <View style={styles.capsulePillTop} />
                    <View style={styles.capsulePillBottom} />
              </View>
                </View>
                <Callout tooltip onPress={() => handleCalloutPress(capsule)}>
                  <View style={styles.calloutContainer}>
                    <Text style={styles.calloutTitle} numberOfLines={2} ellipsizeMode="tail">
                      {capsule.title}
                    </Text>
                    <View style={styles.infoButton}>
                      <Ionicons name="information-circle" size={16} color="#FAC638" style={styles.infoIcon} />
                      <Text style={styles.infoButtonText}>Tap for details</Text>
                    </View>
                  </View>
                </Callout>
            </Marker>
            );
          })}
        </MapView>
        
        {/* Hamburger Menu - Overlay on Map */}
        <TouchableOpacity 
          style={styles.menuButtonOverlay}
          onPress={() => onNavigate('Profile')}
        >
          <View style={styles.menuButtonCircle}>
            <Ionicons name="menu" size={24} color="#1e293b" />
          </View>
        </TouchableOpacity>
        
      </View>

      {/* Navigation/Location Button - Fixed on Map, Moves with Bottom Sheet */}
      <Animated.View
        style={[
          styles.mapControlContainer,
          {
            bottom: bottomSheetHeight.interpolate({
              inputRange: [COLLAPSED_HEIGHT, EXPANDED_HEIGHT],
              outputRange: [COLLAPSED_HEIGHT + 20, EXPANDED_HEIGHT + 20],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.mapControl}
          onPress={handleCenterOnLocation}
          activeOpacity={0.7}
        >
          <Ionicons name="navigate" size={24} color="#1e293b" />
        </TouchableOpacity>
      </Animated.View>

      {/* Draggable Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            height: bottomSheetHeight,
          },
        ]}
      >
        {/* Drag Handle - Only draggable area */}
        <View style={styles.dragHandleContainer} {...panResponder.panHandlers}>
          <View style={styles.dragHandle} />
      </View>

        {/* Scrollable Content Inside Bottom Sheet */}
        <ScrollView
          style={styles.bottomSheetContent}
          contentContainerStyle={styles.bottomSheetContentContainer}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
          decelerationRate="normal"
          bounces={true}
          overScrollMode="auto"
        >
      {/* Invite Banner */}
      <View style={styles.inviteBanner}>
        <Text style={styles.inviteText}>Invite a friend!</Text>
            <TouchableOpacity style={styles.inviteButton} onPress={openInviteModal}>
          <Text style={styles.inviteButtonText}>Invite</Text>
        </TouchableOpacity>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
                placeholder="Find a Capsule!"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
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
            <Text style={styles.infoText}>Drop a capsule, create a memory for future</Text>
      </View>

      {/* My Friends Section */}
      <View style={styles.friendsSection}>
        <Text style={styles.friendsSectionTitle}>My Friends</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.friendsScrollContent}
        >
          {friends.map((friend) => (
            <TouchableOpacity
              key={friend.id}
              style={styles.friendItem}
              onPress={() => handleFriendPress(friend)}
              activeOpacity={0.7}
            >
              {friend.avatar_url ? (
                <Image source={{ uri: friend.avatar_url }} style={styles.friendAvatar} />
              ) : (
                <View style={[styles.friendAvatar, styles.friendAvatarPlaceholder]}>
                  <Ionicons name="person" size={32} color="#94a3b8" />
                </View>
              )}
              <Text style={styles.friendName} numberOfLines={1}>
                {friend.name.split(' ')[0]}
              </Text>
        </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
        </ScrollView>
      </Animated.View>

      {/* Capsule Detail Modal - Bottom Sheet */}
      <Modal
        visible={showTimeModal}
        transparent
        animationType="none"
        onRequestClose={closeDetailModal}
      >
        <View style={styles.detailModalContainer}>
          {/* Backdrop */}
          <Animated.View 
            style={[
              styles.detailModalBackdrop,
              { opacity: detailModalBackdropOpacity }
            ]}
          >
            <TouchableOpacity 
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeDetailModal}
            />
          </Animated.View>

          {/* Bottom Sheet */}
          <Animated.View
            style={[
              styles.detailModalSheet,
              {
                transform: [{ translateY: detailModalTranslateY }],
                height: DETAIL_MODAL_HEIGHT,
              },
            ]}
          >
            {/* Drag Handle - Swipe down to dismiss */}
            <View style={styles.detailModalDragHandle} {...detailModalPanResponder.panHandlers}>
              <View style={styles.detailModalDragBar} />
            </View>

            {/* Close Button */}
            <TouchableOpacity 
              style={styles.detailModalCloseButton}
              onPress={closeDetailModal}
            >
              <Ionicons name="close" size={24} color="#64748b" />
        </TouchableOpacity>

            {/* Scrollable Content */}
            <View style={styles.detailModalContentWrapper}>
              <ScrollView
                style={styles.detailModalContent}
                contentContainerStyle={styles.detailModalContentContainer}
                showsVerticalScrollIndicator={false}
                scrollEnabled={!isCapsuleLocked(selectedCapsule?.open_at)}
              >
                {selectedCapsule && (
                <>
                  {/* Shared With Section - Always at Top (Not Blurred) */}
                  <View style={styles.detailModalSharedSection}>
                    <Text style={styles.detailModalSharedTitle}>Shared With</Text>
                    
                    {selectedCapsule.is_public ? (
                      <View style={styles.detailModalPublicBadge}>
                        <Ionicons name="globe-outline" size={20} color="#06D6A0" />
                        <Text style={styles.detailModalPublicText}>This capsule is public</Text>
                      </View>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.detailModalSharedScrollContent}
                      >
                        {selectedCapsule.allowed_users && selectedCapsule.allowed_users.map((username: string, index: number) => {
                          // Check if this is the current user
                          const isCurrentUser = username === 'you' || index === 0; // Mock check
                          const friend = friends.find(f => f.username === username);
                          
                          return (
                            <View key={index} style={styles.detailModalSharedUser}>
                              <View style={styles.detailModalSharedAvatar}>
                                {friend?.avatar_url ? (
                                  <Image source={{ uri: friend.avatar_url }} style={styles.detailModalSharedAvatarImage} />
                                ) : (
                                  <View style={styles.detailModalSharedAvatarPlaceholder}>
                                    <Ionicons name="person" size={24} color="#94a3b8" />
                                  </View>
                                )}
                                {isCurrentUser && (
                                  <View style={styles.detailModalSharedBadge}>
                                    <Ionicons name="checkmark-circle" size={16} color="#FAC638" />
                                  </View>
                                )}
                              </View>
                              <Text style={styles.detailModalSharedName} numberOfLines={1}>
                                {friend?.name.split(' ')[0] || username}
                              </Text>
                              {isCurrentUser && (
                                <Text style={styles.detailModalSharedYouBadge}>You</Text>
                              )}
                            </View>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>

                  {/* Media Preview Section - Hidden when locked */}
                  {isMediaShared(selectedCapsule) && !isCapsuleLocked(selectedCapsule.open_at) && (
                    <View style={styles.detailModalMediaHeader}>
                      <View style={styles.detailModalMediaPreview}>
                        {selectedCapsule.content_refs.slice(0, 1).map((item: any, index: number) => {
                          const mediaUrl = item.uri || item.url || item;
                          const isImage = typeof mediaUrl === 'string' && 
                            (mediaUrl.includes('image') || 
                             mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                          
                          return (
                            <Image 
                              key={index}
                              source={{ uri: isImage ? mediaUrl : undefined }} 
                              style={styles.detailModalHeaderImage}
                              resizeMode="cover"
                            />
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Locked Media Placeholder */}
                  {isMediaShared(selectedCapsule) && isCapsuleLocked(selectedCapsule.open_at) && (
                    <View style={styles.detailModalMediaHeader}>
                      <View style={[styles.detailModalMediaPreview, styles.detailModalMediaLocked]}>
                        <Ionicons name="lock-closed" size={48} color="#64748b" />
                      </View>
                    </View>
                  )}

                  {/* Capsule Title */}
                  <Text style={styles.detailModalTitle}>
                    {selectedCapsule.title}
                  </Text>

                  {/* Description */}
                  {selectedCapsule.description && (
                    <Text style={styles.detailModalDescription}>
                      {selectedCapsule.description}
                    </Text>
                  )}

                  {/* Time Countdown Cards */}
                  <View style={styles.detailModalCountdownContainer}>
                    {(() => {
                      const timeData = getTimeComponents(selectedCapsule.open_at);
                      return (
                        <>
                          <View style={styles.detailModalCountdownCard}>
                            <Text style={styles.detailModalCountdownValue}>{timeData.days}</Text>
                            <Text style={styles.detailModalCountdownLabel}>Days</Text>
                          </View>
                          <View style={styles.detailModalCountdownCard}>
                            <Text style={styles.detailModalCountdownValue}>{timeData.hours}</Text>
                            <Text style={styles.detailModalCountdownLabel}>Hours</Text>
                          </View>
                          <View style={styles.detailModalCountdownCard}>
                            <Text style={styles.detailModalCountdownValue}>{timeData.minutes}</Text>
                            <Text style={styles.detailModalCountdownLabel}>Minutes</Text>
                          </View>
                          <View style={[styles.detailModalCountdownCard, styles.detailModalCountdownCardLast]}>
                            <Text style={styles.detailModalCountdownValue}>{timeData.seconds}</Text>
                            <Text style={styles.detailModalCountdownLabel}>Seconds</Text>
                          </View>
                        </>
                      );
                    })()}
                  </View>

                  {/* From Section */}
                  <View style={styles.detailModalInfoSection}>
                    <Text style={styles.detailModalInfoLabel}>From</Text>
                    <View style={styles.detailModalInfoCard}>
                      <View style={styles.detailModalAvatar}>
                        <Ionicons name="person" size={24} color="#64748b" />
                      </View>
                      <Text style={styles.detailModalInfoText}>You</Text>
                    </View>
                  </View>

                  {/* Opening Conditions */}
                  <View style={styles.detailModalInfoSection}>
                    <Text style={styles.detailModalInfoLabel}>Opening Conditions</Text>
                    
                    <View style={styles.detailModalConditionRow}>
                      <View style={styles.detailModalConditionIcon}>
                        <Ionicons name="calendar-outline" size={20} color="#64748b" />
                      </View>
                      <View style={styles.detailModalConditionContent}>
                        <Text style={styles.detailModalConditionTitle}>
                          {formatDate(selectedCapsule.open_at)}
                        </Text>
                        <Text style={styles.detailModalConditionSubtitle}>
                          Time: {new Date(selectedCapsule.open_at || '').toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Text>
                      </View>
                    </View>

                    {(selectedCapsule.lat && selectedCapsule.lng) && (
                      <View style={styles.detailModalConditionRow}>
                        <View style={styles.detailModalConditionIcon}>
                          <Ionicons name="location-outline" size={20} color="#64748b" />
                        </View>
                        <View style={styles.detailModalConditionContent}>
                          <Text style={styles.detailModalConditionTitle}>Location</Text>
                          <Text style={styles.detailModalConditionSubtitle}>
                            View on Map
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Additional Media Grid - Only show when unlocked */}
                  {isMediaShared(selectedCapsule) && !isCapsuleLocked(selectedCapsule.open_at) && selectedCapsule.content_refs.length > 1 && (
                    <View style={styles.detailModalMediaGrid}>
                      {selectedCapsule.content_refs.slice(1).map((item: any, index: number) => {
                        const mediaUrl = item.uri || item.url || item;
                        const isImage = typeof mediaUrl === 'string' && 
                          (mediaUrl.includes('image') || 
                           mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                        const isVideo = typeof mediaUrl === 'string' && 
                          (mediaUrl.includes('video') || 
                           mediaUrl.match(/\.(mp4|mov|avi|webm)$/i));

                        return (
                          <View key={index} style={styles.detailModalMediaGridItem}>
                            {isImage ? (
                              <Image 
                                source={{ uri: mediaUrl }} 
                                style={styles.detailModalMediaGridImage}
                                resizeMode="cover"
                              />
                            ) : isVideo ? (
                              <View style={styles.detailModalMediaGridVideo}>
                                <Ionicons name="play-circle" size={32} color="white" />
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Bottom Padding for Fixed Button */}
                  <View style={styles.detailModalBottomPadding} />
                </>
              )}
              </ScrollView>

            </View>

            {/* Blur Overlay for Locked Capsules - Outside content wrapper for proper layering */}
            {selectedCapsule && isCapsuleLocked(selectedCapsule.open_at) && (
              <View style={styles.detailModalBlurContainer} pointerEvents="auto">
                <BlurView 
                  intensity={100} 
                  tint="dark"
                  style={styles.detailModalBlurView}
                />
                <View style={styles.detailModalLockedOverlay} pointerEvents="none">
                  <View style={styles.detailModalLockedBadge}>
                    <Ionicons name="lock-closed" size={40} color="#FAC638" />
                    <Text style={styles.detailModalLockedText}>Locked</Text>
                    <Text style={styles.detailModalLockedSubtext}>
                      This capsule will open {formatTimeUntilOpen(selectedCapsule.open_at).toLowerCase()}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Fixed Share Button at Bottom */}
            <View style={styles.detailModalFooter}>
              <TouchableOpacity 
                style={styles.detailModalShareButton}
                onPress={() => Alert.alert('Share', 'Share functionality coming soon!')}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social" size={20} color="#1e293b" style={styles.detailModalShareIcon} />
                <Text style={styles.detailModalShareText}>Share Capsule</Text>
        </TouchableOpacity>
      </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Invite Friend Modal - Bottom Sheet */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="none"
        onRequestClose={closeInviteModal}
      >
        <View style={styles.inviteModalContainer}>
          {/* Backdrop */}
          <Animated.View 
            style={[
              styles.inviteModalBackdrop,
              { opacity: inviteModalBackdropOpacity }
            ]}
          >
            <TouchableOpacity 
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeInviteModal}
            />
          </Animated.View>

          {/* Bottom Sheet */}
          <Animated.View
            style={[
              styles.inviteModalSheet,
              {
                transform: [{ translateY: inviteModalTranslateY }],
                height: INVITE_MODAL_HEIGHT,
              },
            ]}
          >
            {/* Drag Handle */}
            <View style={styles.inviteModalDragHandle} {...inviteModalPanResponder.panHandlers}>
              <View style={styles.inviteModalDragBar} />
            </View>

            {/* Close Button */}
            <TouchableOpacity 
              style={styles.inviteModalCloseButton}
              onPress={closeInviteModal}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="#64748b" />
        </TouchableOpacity>

            {/* Scrollable Content */}
            <ScrollView
              style={styles.inviteModalContent}
              contentContainerStyle={styles.inviteModalContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Image/Banner Area - Reserved for future asset */}
              <View style={styles.inviteModalImagePlaceholder}>
                <Ionicons name="gift" size={64} color="#FAC638" />
      </View>

              {/* Main Heading */}
              <Text style={styles.inviteModalTitle}>
                Invite Friend to TimeCapsule and earn 5 Premium Capsules!
              </Text>

              {/* Subtext */}
              <Text style={styles.inviteModalSubtext}>
                When your friend drops their first Capsule, both of you receive 5 Premium Capsules.
              </Text>

              {/* Form Section */}
              <View style={styles.inviteModalForm}>
                <Text style={styles.inviteModalFormLabel}>Friend's Username or Email</Text>
                <View style={styles.inviteModalInputContainer}>
                  <Ionicons name="person-add-outline" size={20} color="#94a3b8" style={styles.inviteModalInputIcon} />
                  <TextInput
                    style={styles.inviteModalInput}
                    placeholder="Enter friend's username or email"
                    placeholderTextColor="#94a3b8"
                    value={inviteIdentifier}
                    onChangeText={setInviteIdentifier}
                    keyboardType="default"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <Text style={styles.inviteModalInputHint}>
                  Enter either a username (e.g., johndoe) or email address
                </Text>

                {/* Benefits Section */}
                <View style={styles.inviteModalBenefits}>
                  <View style={styles.inviteModalBenefitItem}>
                    <View style={styles.inviteModalBenefitIcon}>
                      <Ionicons name="checkmark-circle" size={24} color="#06D6A0" />
                    </View>
                    <Text style={styles.inviteModalBenefitText}>
                      Get 5 Premium Capsules instantly
                    </Text>
                  </View>
                  <View style={styles.inviteModalBenefitItem}>
                    <View style={styles.inviteModalBenefitIcon}>
                      <Ionicons name="checkmark-circle" size={24} color="#06D6A0" />
                    </View>
                    <Text style={styles.inviteModalBenefitText}>
                      Help your friend save memories
                    </Text>
                  </View>
                  <View style={styles.inviteModalBenefitItem}>
                    <View style={styles.inviteModalBenefitIcon}>
                      <Ionicons name="checkmark-circle" size={24} color="#06D6A0" />
                    </View>
                    <Text style={styles.inviteModalBenefitText}>
                      Build your TimeCapsule community
                    </Text>
                  </View>
                </View>

                {/* Invite Action Button */}
                <TouchableOpacity 
                  style={styles.inviteModalActionButton}
                  onPress={handleSendInvite}
                  activeOpacity={0.8}
                >
                  <Ionicons name="paper-plane" size={20} color="white" style={styles.inviteModalActionButtonIcon} />
                  <Text style={styles.inviteModalActionButtonText}>Send Invitation</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f5',
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  menuButtonOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: 16,
    zIndex: 1000,
  },
  menuButtonCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  map: {
    flex: 1,
  },
  mapControlContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 500,
  },
  mapControl: {
    backgroundColor: 'white',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  capsuleMarker: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  capsulePill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FAC638',
  },
  capsulePillTop: {
    flex: 1,
    backgroundColor: '#FF6B6B',
  },
  capsulePillBottom: {
    flex: 1,
    backgroundColor: '#FAC638',
  },
  calloutContainer: {
    width: 220,
    minHeight: 70,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 20,
    width: '100%',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FAC63815',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FAC63840',
    minWidth: 140,
  },
  infoIcon: {
    marginRight: 6,
  },
  infoButtonText: {
    fontSize: 13,
    color: '#FAC638',
    fontWeight: '600',
  },
  detailModalContainer: {
    flex: 1,
  },
  detailModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  detailModalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
    zIndex: 1000,
  },
  detailModalDragHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    cursor: 'grab',
  },
  detailModalDragBar: {
    width: 40,
    height: 5,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
  },
  detailModalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1001,
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  detailModalContentWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    marginTop: 0,
  },
  detailModalContent: {
    flex: 1,
  },
  detailModalContentContainer: {
    paddingBottom: 100, // Space for fixed button
  },
  detailModalBlurContainer: {
    position: 'absolute',
    top: 120, // Start below "Shared With" section (estimated height ~120px)
    left: 0,
    right: 0,
    bottom: 100, // Don't cover the share button
    zIndex: 999,
  },
  detailModalBlurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  detailModalLockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  detailModalLockedBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    paddingHorizontal: 48,
    paddingVertical: 40,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: '#FAC638',
    shadowColor: '#FAC638',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
    minWidth: 280,
  },
  detailModalLockedText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FAC638',
    marginTop: 20,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  detailModalLockedSubtext: {
    fontSize: 15,
    color: '#cbd5e1',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 240,
  },
  detailModalMediaHeader: {
    width: '100%',
    marginBottom: 0,
  },
  detailModalMediaPreview: {
    width: '100%',
    height: 280,
    backgroundColor: '#1e293b',
    position: 'relative',
  },
  detailModalMediaLocked: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d3748',
  },
  detailModalHeaderImage: {
    width: '100%',
    height: '100%',
    opacity: 0.7,
  },
  detailModalTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 24,
    marginHorizontal: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  detailModalDescription: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginHorizontal: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  detailModalCountdownContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 8,
  },
  detailModalCountdownCard: {
    flex: 1,
    backgroundColor: '#2d3748',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  detailModalCountdownCardLast: {
    backgroundColor: '#3b4a5f',
  },
  detailModalCountdownValue: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  detailModalCountdownLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  detailModalInfoSection: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  detailModalInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Shared With Section - At Top of Content (Always Visible)
  detailModalSharedSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 0,
    zIndex: 1000,
    position: 'relative',
  },
  detailModalSharedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  detailModalPublicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06D6A015',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  detailModalPublicText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#06D6A0',
  },
  detailModalSharedScrollContent: {
    paddingRight: 20,
  },
  detailModalSharedUser: {
    alignItems: 'center',
    marginRight: 16,
    width: 64,
  },
  detailModalSharedAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
  },
  detailModalSharedAvatarImage: {
    width: '100%',
    height: '100%',
  },
  detailModalSharedAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalSharedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  detailModalSharedName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 2,
  },
  detailModalSharedYouBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FAC638',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailModalInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  detailModalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  detailModalConditionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  detailModalConditionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalConditionContent: {
    flex: 1,
  },
  detailModalConditionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  detailModalConditionSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  detailModalMediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 24,
    marginBottom: 24,
    gap: 8,
  },
  detailModalMediaGridItem: {
    width: '48%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  detailModalMediaGridImage: {
    width: '100%',
    height: '100%',
  },
  detailModalMediaGridVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalBottomPadding: {
    height: 20,
  },
  detailModalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    zIndex: 1001,
  },
  detailModalShareButton: {
    backgroundColor: '#FAC638',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FAC638',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  detailModalShareIcon: {
    marginRight: 8,
  },
  detailModalShareText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
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
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  // Friends Section
  friendsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  friendsSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  friendsScrollContent: {
    paddingRight: 20,
  },
  friendItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 72,
  },
  friendAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#FAC638',
  },
  friendAvatarPlaceholder: {
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8f8f5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 100,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
  },
  bottomSheetContent: {
    flex: 1,
  },
  bottomSheetContentContainer: {
    paddingBottom: Platform.OS === 'ios' ? 200 : 180,
  },
  // Invite Modal Styles
  inviteModalContainer: {
    flex: 1,
  },
  inviteModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  inviteModalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
    zIndex: 1000,
  },
  inviteModalDragHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    cursor: 'grab',
  },
  inviteModalDragBar: {
    width: 40,
    height: 5,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
  },
  inviteModalCloseButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1002,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  inviteModalContent: {
    flex: 1,
  },
  inviteModalContentContainer: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  inviteModalImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  inviteModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 32,
  },
  inviteModalSubtext: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  inviteModalForm: {
    width: '100%',
  },
  inviteModalFormLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  inviteModalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  inviteModalInputHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 16,
  },
  inviteModalInputIcon: {
    marginRight: 12,
  },
  inviteModalInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  inviteModalBenefits: {
    marginBottom: 24,
  },
  inviteModalBenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inviteModalBenefitIcon: {
    marginRight: 12,
  },
  inviteModalBenefitText: {
    fontSize: 15,
    color: '#64748b',
    flex: 1,
  },
  inviteModalActionButton: {
    backgroundColor: '#FAC638',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FAC638',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  inviteModalActionButtonIcon: {
    marginRight: 8,
  },
  inviteModalActionButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
  },
});

export default DashboardScreen;
