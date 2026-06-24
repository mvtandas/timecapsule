import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, TextInput, Dimensions, Platform, Animated, PanResponder, Modal, Image, KeyboardAvoidingView, Share } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { DARK_MAP_STYLE } from '../../constants/mapStyle';
import * as Location from 'expo-location';
import { BlurView } from 'expo-blur';
import { CapsuleService } from '../../services/capsuleService';
import { CapsuleIcon } from '../../components/common/CapsuleIcon';
import CapsuleDetailModal from '../../components/CapsuleDetailModal';
import { calculateDistance } from '../../utils/geoUtils';
import { formatDistance } from '../../utils/geoUtils';
import { getMediaUrl, isLocked } from '../../utils/mediaUtils';
import { formatDate, timeAgo } from '../../utils/dateUtils';
import { openDirections } from '../../utils/directions';
import { COLORS, font, SPACING, RADIUS } from '../../constants/theme';
import { capColor, getCapType, LAUNCH_CAP_TYPES } from '../../constants/capTypes';
import CapTypeIcon from '../../components/common/CapTypeIcon';
import MessagesButton from '../../components/common/MessagesButton';
import { supabase } from '../../lib/supabase';
import { FriendService } from '../../services/friendService';
import { useT } from '../../i18n';

type FeedTab = 'all' | 'mine' | 'friends' | 'nearby' | 'new' | 'popular';
const FEED_TABS: FeedTab[] = ['all', 'mine', 'friends', 'nearby', 'new', 'popular'];

// Distance filter options in km (matches the km unit used by geoUtils throughout
// this screen). `null` = "Any" (no distance cap).
type DistFilter = number | null;
const DIST_OPTIONS: number[] = [0.5, 1, 2, 5, 10];

// Cap-type filter for the map markers + nearby feed. `null` = "All types".
type TypeFilter = string | null;

// Teardrop pin path (mirrors src/components/common/CapTypeIcon.tsx — the
// voorcap.com brand mark, viewBox 200x280). Used for the map markers.
const PIN_PATH = 'M 100 18 C 55 18, 22 52, 22 98 C 22 148, 66 190, 100 235 C 134 190, 178 148, 178 98 C 178 52, 145 18, 100 18 Z';

interface DashboardScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

const { width, height } = Dimensions.get('window');

const DashboardScreen = ({ onNavigate }: DashboardScreenProps) => {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState({
    latitude: 40.9887,
    longitude: 29.0241,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [activeTab, setActiveTab] = useState<FeedTab>('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [capsules, setCapsules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCapsule, setSelectedCapsule] = useState<any>(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [lastTappedCapsule, setLastTappedCapsule] = useState<string | null>(null);
  // Distance filter for both the feed rows and the map markers (default: Any).
  const [distFilter, setDistFilter] = useState<DistFilter>(null);
  const [distMenuOpen, setDistMenuOpen] = useState(false);
  // Cap-TYPE filter (on-map control) for both map markers and the nearby feed.
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(null);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  // Live map region — tracked so the +/- zoom buttons can scale the deltas.
  const regionRef = useRef(userLocation);
  // Cap selected by tapping a map marker — drives the bottom-sheet popup card.
  const [selectedMarkerCap, setSelectedMarkerCap] = useState<any>(null);
  // Reverse-geocoded name of the user's current location (shown in the header).
  const [locationName, setLocationName] = useState<string>(t('dashboard.yourLocation'));
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView>(null);
  

  // Invite modal state and animation
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const INVITE_MODAL_HEIGHT = height * 0.9;
  const inviteModalTranslateY = useRef(new Animated.Value(INVITE_MODAL_HEIGHT)).current;
  const inviteModalBackdropOpacity = useRef(new Animated.Value(0)).current;
  
  // Bottom sheet animation values with multiple snap points
  const SNAP_POINTS = {
    COLLAPSED: height * 0.35,  // 35% - Initial collapsed state
    MEDIUM: height * 0.60,     // 60% - Medium expanded state
    EXPANDED: height * 0.90,   // 90% - Fully expanded state
  };
  
  const SNAP_POINT_ARRAY = [
    SNAP_POINTS.COLLAPSED,
    SNAP_POINTS.MEDIUM,
    SNAP_POINTS.EXPANDED,
  ];
  
  const bottomSheetHeight = useRef(new Animated.Value(SNAP_POINTS.COLLAPSED)).current;
  const [currentSnapPoint, setCurrentSnapPoint] = useState(SNAP_POINTS.COLLAPSED);
  // Track the inner list scroll position so a downward drag at the top collapses
  // the sheet (instead of the old pull-to-refresh, which trapped the user).
  const scrollYRef = useRef(0);
  const hasLoadedRef = useRef(false);

  // Animate the sheet to a given snap point.
  const snapTo = (target: number) => {
    setCurrentSnapPoint(target);
    Animated.spring(bottomSheetHeight, {
      toValue: target,
      useNativeDriver: false,
      tension: 80,
      friction: 20,
      overshootClamping: false,
    }).start();
  };

  // Reload caps when Home regains focus (replaces the old pull-to-refresh).
  useFocusEffect(
    useCallback(() => {
      loadCapsules();
    }, [])
  );

  // Helper function to find nearest snap point
  const findNearestSnapPoint = (currentHeight: number, velocity: number) => {
    // If fast swipe, prioritize velocity direction
    if (Math.abs(velocity) > 0.8) {
      if (velocity < -0.3) {
        // Swiping up fast - go to next snap point
        const nextPoints = SNAP_POINT_ARRAY.filter(p => p > currentHeight);
        return nextPoints.length > 0 ? nextPoints[0] : SNAP_POINTS.EXPANDED;
      } else if (velocity > 0.3) {
        // Swiping down fast - go to previous snap point
        const prevPoints = SNAP_POINT_ARRAY.filter(p => p < currentHeight);
        return prevPoints.length > 0 ? prevPoints[prevPoints.length - 1] : SNAP_POINTS.COLLAPSED;
      }
    }
    
    // Find nearest snap point based on distance
    let nearest = SNAP_POINTS.COLLAPSED;
    let minDistance = Math.abs(currentHeight - nearest);
    
    SNAP_POINT_ARRAY.forEach(snapPoint => {
      const distance = Math.abs(currentHeight - snapPoint);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = snapPoint;
      }
    });
    
    return nearest;
  };

  // PanResponder for smooth draggable bottom sheet
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical movements
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 5;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        // Store current value as offset for smooth dragging
        bottomSheetHeight.stopAnimation((value) => {
          bottomSheetHeight.setOffset(value);
          bottomSheetHeight.setValue(0);
        });
      },
      onPanResponderMove: (_, gestureState) => {
        // Smooth tracking of finger movement
        // Negative dy = dragging up = increasing height
        const newValue = -gestureState.dy;
        
        // Calculate what the actual height would be
        const potentialHeight = (bottomSheetHeight as any)._offset + newValue;
        
        // Allow free movement between min and max with slight resistance at edges
        if (potentialHeight < SNAP_POINTS.COLLAPSED) {
          // Add resistance when dragging below collapsed
          const resistance = 0.3;
          const resistedValue = (potentialHeight - SNAP_POINTS.COLLAPSED) * resistance;
          bottomSheetHeight.setValue(resistedValue);
        } else if (potentialHeight > SNAP_POINTS.EXPANDED) {
          // Add resistance when dragging above expanded
          const resistance = 0.3;
          const excess = potentialHeight - SNAP_POINTS.EXPANDED;
          bottomSheetHeight.setValue(SNAP_POINTS.EXPANDED - (bottomSheetHeight as any)._offset + (excess * resistance));
        } else {
          // Free movement in valid range
          bottomSheetHeight.setValue(newValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Flatten offset to get actual value
        bottomSheetHeight.flattenOffset();

        const currentHeight = (bottomSheetHeight as any)._value;
        const velocity = gestureState.vy; // Negative = up, Positive = down

        // A near-stationary press is a TAP on the handle, not a drag.
        // Tap toggles: if collapsed -> open to medium, otherwise -> collapse.
        // This guarantees the user can always bring an expanded sheet back down.
        const isTap = Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6;
        const collapseMidpoint = (SNAP_POINTS.COLLAPSED + SNAP_POINTS.MEDIUM) / 2;

        const targetHeight = isTap
          ? (currentHeight <= collapseMidpoint ? SNAP_POINTS.MEDIUM : SNAP_POINTS.COLLAPSED)
          : findNearestSnapPoint(currentHeight, velocity);

        setCurrentSnapPoint(targetHeight);

        // Animate to snap point with natural spring physics
        Animated.spring(bottomSheetHeight, {
          toValue: targetHeight,
          velocity: isTap ? 0 : -velocity * 500, // Convert gesture velocity to animation velocity
          useNativeDriver: false,
          tension: 80,
          friction: 20,
          overshootClamping: false,
        }).start();
      },
    })
  ).current;

  // Gesture handler for the LIST area: when the list is at its top and the user
  // drags DOWN, capture the gesture (before the ScrollView) and drag the sheet
  // down to collapse it. This is what lets the user swipe the caps down to get
  // back to the map — replacing the old pull-to-refresh that trapped them.
  const contentPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_, g) => {
        const draggingDown = g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx);
        const atTop = scrollYRef.current <= 0;
        const h = (bottomSheetHeight as any)._value;
        return draggingDown && atTop && h > SNAP_POINTS.COLLAPSED + 1;
      },
      onPanResponderGrant: () => {
        bottomSheetHeight.stopAnimation((value) => {
          bottomSheetHeight.setOffset(value);
          bottomSheetHeight.setValue(0);
        });
      },
      onPanResponderMove: (_, g) => {
        const newValue = -g.dy; // dragging down => negative => shrink the sheet
        const potentialHeight = (bottomSheetHeight as any)._offset + newValue;
        if (potentialHeight < SNAP_POINTS.COLLAPSED) {
          bottomSheetHeight.setValue((potentialHeight - SNAP_POINTS.COLLAPSED) * 0.3);
        } else {
          bottomSheetHeight.setValue(newValue);
        }
      },
      onPanResponderRelease: (_, g) => {
        bottomSheetHeight.flattenOffset();
        const currentHeight = (bottomSheetHeight as any)._value;
        snapTo(findNearestSnapPoint(currentHeight, g.vy));
      },
    })
  ).current;

  const loadCapsules = async (showSpinner = false) => {
    try {
      // Spinner on first load and on explicit refresh (tab tap); focus-reloads stay silent.
      if (!hasLoadedRef.current || showSpinner) setLoading(true);
      // who am I + my friends (for the My Caps / Friends feed tabs)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user?.id || null);
        const fr = await FriendService.getFriends();
        const ids = ((fr as any)?.data || []).map((f: any) => f.id || f.friend_id || f.user_id).filter(Boolean);
        setFriendIds(new Set(ids));
      } catch { /* ignore */ }
      // Fetch all accessible capsules (owned + public + shared)
      const { data, error } = await CapsuleService.getAllAccessibleCapsules();
      if (error) {
        if (__DEV__) console.error('Error loading capsules:', error);
      } else {
        // Generate stable coordinates for each capsule (only once)
        const capsulesWithCoordinates = (data || []).map((capsule, index) => ({
          ...capsule,
          // Use capsule ID to generate consistent coordinates
          displayLat: capsule.lat || (userLocation.latitude + (Math.sin(index) * 0.005)),
          displayLng: capsule.lng || (userLocation.longitude + (Math.cos(index) * 0.005)),
        }));
        setCapsules(capsulesWithCoordinates);
        hasLoadedRef.current = true;
      }
    } catch (error) {
      if (__DEV__) console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Distance (km) from the user to a cap, using its stable display coordinates.
  const capDistance = (cap: any): number =>
    calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      cap.displayLat || cap.lat || userLocation.latitude,
      cap.displayLng || cap.lng || userLocation.longitude,
    );

  // Reverse-geocode the user's coordinates into a friendly place name for the
  // nearby header. Falls back to the default "Your location" label on failure.
  const refreshLocationName = useCallback(async (lat: number, lng: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const a = results[0];
      if (a) {
        const name = [a.city || a.name || a.street, a.region].filter(Boolean).join(', ');
        if (name) setLocationName(name);
      }
    } catch {
      // keep the existing label on failure
    }
  }, []);

  // Resolve the location name once on focus for the initial coordinates.
  useFocusEffect(
    useCallback(() => {
      refreshLocationName(userLocation.latitude, userLocation.longitude);
    }, [])
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Filter capsules based on search query
  const filteredCapsules = searchQuery.trim()
    ? capsules.filter((c: any) =>
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : capsules;

  const handleCreateCapsule = () => {
    onNavigate('Create');
  };

  const handleMyCapsules = () => {
    onNavigate('MyCapsules');
  };

  const formatTimeUntilOpen = (openDate: string | null): string => {
    if (!openDate) return t('dashboard.noOpenDate');

    const now = new Date();
    const openDateObj = new Date(openDate);
    const diff = openDateObj.getTime() - now.getTime();

    if (diff <= 0) return t('dashboard.opened');

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      const dayLabel = days === 1 ? t('dashboard.dayOne') : t('dashboard.dayOther');
      const hourLabel = hours === 1 ? t('dashboard.hourOne') : t('dashboard.hourOther');
      return t('dashboard.opensInDaysHours', { days, dayLabel, hours, hourLabel });
    }
    if (hours > 0) {
      const hourLabel = hours === 1 ? t('dashboard.hourOne') : t('dashboard.hourOther');
      const minuteLabel = minutes === 1 ? t('dashboard.minuteOne') : t('dashboard.minuteOther');
      return t('dashboard.opensInHoursMinutes', { hours, hourLabel, minutes, minuteLabel });
    }
    const minuteLabel = minutes === 1 ? t('dashboard.minuteOne') : t('dashboard.minuteOther');
    return t('dashboard.opensInMinutes', { minutes, minuteLabel });
  };

  const handleCapsuleMarkerPress = (capsule: any) => {
    // Track which capsule was tapped and surface the detail popup card.
    setLastTappedCapsule(capsule.id);
    setSelectedMarkerCap(capsule);
  };


  const openCapsuleDetail = async (capsule: any) => {
    setSelectedCapsule(capsule);
    setShowTimeModal(true);

    // Increment view count — but not for time-locked caps (else taps on sealed
    // caps inflate the Popular sort, which ranks by view_count).
    if (capsule?.id && !isLocked(capsule.open_at)) {
      try {
        await CapsuleService.incrementViewCount(capsule.id);
      } catch {
        // Silently ignore
      }
    }
  };

  const handleMarkerPress = async (capsule: any) => {
    openCapsuleDetail(capsule);
  };

  const isMediaShared = (capsule: any): boolean => {
    // Check if capsule has any media (media_url or content_refs)
    if (capsule?.media_url && capsule.media_type !== 'none') return true;
    if (capsule?.content_refs && Array.isArray(capsule.content_refs) && capsule.content_refs.length > 0) return true;
    return false;
  };

  // Get all media URLs for a capsule (combines media_url and content_refs)
  const getCapsuleMediaUrls = (capsule: any): string[] => {
    const urls: string[] = [];

    // Add media_url first (primary media)
    if (capsule?.media_url && capsule.media_type !== 'none') {
      urls.push(capsule.media_url);
    }

    // Add content_refs URLs
    if (capsule?.content_refs && Array.isArray(capsule.content_refs)) {
      for (const item of capsule.content_refs) {
        let url: string | null = null;
        if (typeof item === 'string' && item.startsWith('http')) {
          url = item;
        } else if (item && typeof item === 'object') {
          url = item.url || item.file_url || null;
        }
        if (url && url.startsWith('http') && !urls.includes(url)) {
          urls.push(url);
        }
      }
    }

    return urls;
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
      return { isValid: false, type: null, error: t('dashboard.errorEnterIdentifier') };
    }

    // Check if it's an email (contains @)
    if (trimmed.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        return { isValid: false, type: 'email', error: t('dashboard.errorInvalidEmail') };
      }
      return { isValid: true, type: 'email' };
    }

    // Otherwise treat as username
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(trimmed)) {
      return { isValid: false, type: 'username', error: t('dashboard.errorInvalidUsername') };
    }
    
    return { isValid: true, type: 'username' };
  };

  const handleSendInvite = () => {
    const validation = validateInviteIdentifier(inviteIdentifier);
    
    if (!validation.isValid) {
      Alert.alert(t('dashboard.invalidInputTitle'), validation.error || t('dashboard.checkInput'));
      return;
    }

    // Show success message
    const identifierType = validation.type === 'email' ? t('dashboard.emailAddress') : t('dashboard.username');
    Alert.alert(
      t('dashboard.inviteSentTitle'),
      t('dashboard.inviteSentMessage', { type: identifierType, identifier: inviteIdentifier.trim() }),
      [
        {
          text: t('dashboard.ok'),
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
        inviteModalTranslateY.setOffset((inviteModalTranslateY as any)._value);
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
        
        const currentTranslate = (inviteModalTranslateY as any)._value;
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
          t('dashboard.locationPermissionTitle'),
          t('dashboard.locationPermissionMessage'),
          [{ text: t('dashboard.ok') }]
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

      // Refresh the header's location name for the new coordinates
      refreshLocationName(newRegion.latitude, newRegion.longitude);

      // Animate map to user location
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      if (__DEV__) console.error('Error getting location:', error);
      Alert.alert(
        t('dashboard.errorTitle'),
        t('dashboard.locationErrorMessage'),
        [{ text: t('dashboard.ok') }]
      );
    }
  };

  // +/- zoom buttons. react-native-maps has no zoomIn/zoomOut, so we scale the
  // tracked region's deltas (smaller = zoomed in) and animate to it.
  const handleZoom = (factor: number) => {
    const r = regionRef.current;
    const next = {
      latitude: r.latitude,
      longitude: r.longitude,
      latitudeDelta: Math.max(r.latitudeDelta * factor, 0.0005),
      longitudeDelta: Math.max(r.longitudeDelta * factor, 0.0005),
    };
    // Track immediately so rapid consecutive taps compound off the new zoom
    // (onRegionChangeComplete also updates this, but only after the animation).
    regionRef.current = next;
    mapRef.current?.animateToRegion(next, 250);
  };

  // Caps shown on the map after both the distance and the cap-type filters.
  const visibleCaps = filteredCapsules.filter(
    (capsule) =>
      (distFilter == null || capDistance(capsule) <= distFilter) &&
      (typeFilter == null || capsule.type === typeFilter),
  );

  return (
    <View style={styles.container}>
      {/* Map Section - Full Screen Background */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          customMapStyle={DARK_MAP_STYLE}
          style={styles.map}
          initialRegion={userLocation}
          showsUserLocation={true}
          showsMyLocationButton={false}
          moveOnMarkerPress={false}
          zoomEnabled={true}
          scrollEnabled={true}
          pitchEnabled={false}
          rotateEnabled={false}
          onRegionChangeComplete={(r) => { regionRef.current = r; }}
        >
          {/* Capsule markers — filtered by the active distance + type filters */}
          {visibleCaps
            .map((capsule, index) => {
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
                // SVG children render async, so let the marker track changes
                // (otherwise the teardrop can snapshot blank on first paint).
                tracksViewChanges={true}
                stopPropagation={true}
                flat={true}
            >
              <View style={styles.capsuleMarker}>
                {/* Branded voorcap teardrop + sigil (type-tinted), mirroring
                    CapTypeIcon / the design demo's createCapMarkerElement. */}
                <Svg width={26} height={36} viewBox="0 0 200 280">
                  <Path
                    d={PIN_PATH}
                    fill={`${capColor(capsule.type)}25`}
                    stroke={capColor(capsule.type)}
                    strokeWidth={7}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <Line
                    x1={42}
                    y1={118}
                    x2={158}
                    y2={118}
                    stroke={capColor(capsule.type)}
                    strokeWidth={7}
                    strokeLinecap="round"
                  />
                  <Circle cx={100} cy={168} r={13} fill={capColor(capsule.type)} />
                  <Circle cx={100} cy={168} r={4.5} fill="#fff" opacity={0.8} />
                </Svg>
              </View>
            </Marker>
            );
          })}
        </MapView>

      </View>

      {/* "N nearby" overlay chip (top-left) — live count of shown caps */}
      <View style={[styles.nearbyChip, { top: insets.top + SPACING.sm }]} pointerEvents="none">
        <Text style={styles.nearbyChipText}>
          {t('dashboard.nearbyChip', { defaultValue: '%{n} nearby', n: visibleCaps.length })}
        </Text>
      </View>

      {/* On-map cap-TYPE filter control + dropdown (top, left of the message FAB) */}
      <View style={[styles.typeFilterWrap, { top: insets.top + SPACING.sm }]}>
        <TouchableOpacity
          style={[styles.typeFilterBtn, (typeMenuOpen || typeFilter != null) && styles.typeFilterBtnActive]}
          onPress={() => setTypeMenuOpen((o) => !o)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="funnel-outline"
            size={13}
            color={typeFilter != null ? capColor(typeFilter) : COLORS.text2}
          />
          <Text
            style={[
              styles.typeFilterText,
              typeFilter != null && { color: capColor(typeFilter) },
            ]}
          >
            {typeFilter == null
              ? t('dashboard.filterTypes', { defaultValue: 'Filter' })
              : getCapType(typeFilter).name}
          </Text>
          <Ionicons name={typeMenuOpen ? 'chevron-up' : 'chevron-down'} size={11} color={COLORS.text3} />
        </TouchableOpacity>

        {typeMenuOpen && (
          <View style={styles.typeMenu}>
            <TouchableOpacity
              style={styles.typeMenuItem}
              onPress={() => { setTypeFilter(null); setTypeMenuOpen(false); }}
              activeOpacity={0.7}
            >
              <View style={[styles.typeDot, { backgroundColor: typeFilter == null ? COLORS.ember : COLORS.text3 }]} />
              <Text style={[styles.typeMenuItemText, typeFilter == null && styles.typeMenuItemTextActive]}>
                {t('dashboard.allTypes', { defaultValue: 'All types' })}
              </Text>
              {typeFilter == null && <Ionicons name="checkmark" size={14} color={COLORS.ember} style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>
            <View style={styles.typeMenuDivider} />
            {LAUNCH_CAP_TYPES.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.typeMenuItem}
                onPress={() => { setTypeFilter(c.id); setTypeMenuOpen(false); }}
                activeOpacity={0.7}
              >
                <View style={[styles.typeDot, { backgroundColor: c.color }]} />
                <Text style={[styles.typeMenuItemText, typeFilter === c.id && { color: c.color, fontWeight: '700' }]}>
                  {c.name}
                </Text>
                {typeFilter === c.id && <Ionicons name="checkmark" size={14} color={c.color} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Tap-away scrim that closes the type dropdown */}
      {typeMenuOpen && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => setTypeMenuOpen(false)}
        />
      )}

      {/* Floating Messages button (top-right over the map) */}
      <MessagesButton
        glass
        onPress={() => onNavigate('Messages')}
        style={[styles.msgFab, { top: insets.top + SPACING.sm }]}
      />

      {/* Map marker popup card — replaces the plain Callout. Floats just above
          the bottom sheet and offers View Details + Take me there actions. */}
      {selectedMarkerCap && (() => {
        const mc = selectedMarkerCap;
        const ct = getCapType(mc.type);
        return (
          <Animated.View
            style={[
              styles.markerPopup,
              {
                bottom: bottomSheetHeight.interpolate({
                  inputRange: [SNAP_POINTS.COLLAPSED, SNAP_POINTS.EXPANDED],
                  outputRange: [SNAP_POINTS.COLLAPSED + 12, SNAP_POINTS.EXPANDED + 12],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            <View style={styles.markerPopupHeader}>
              <View style={[styles.markerPopupIcon, { backgroundColor: `${ct.color}22` }]}>
                <CapTypeIcon size={20} color={ct.color} filled />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.markerPopupTitle} numberOfLines={1}>{mc.title || ct.name}</Text>
                <Text style={[styles.markerPopupType, { color: ct.color }]}>{ct.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.markerPopupClose}
                onPress={() => setSelectedMarkerCap(null)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={16} color={COLORS.text3} />
              </TouchableOpacity>
            </View>
            <View style={styles.markerPopupActions}>
              <TouchableOpacity
                style={styles.markerPopupBtnSecondary}
                onPress={() => {
                  const cap = mc;
                  setSelectedMarkerCap(null);
                  openCapsuleDetail(cap);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.markerPopupBtnSecondaryText}>{t('dashboard.viewDetails')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.markerPopupBtnPrimary}
                onPress={() => {
                  setSelectedMarkerCap(null);
                  openDirections(
                    mc.displayLat || mc.lat || userLocation.latitude,
                    mc.displayLng || mc.lng || userLocation.longitude,
                    mc.title || ct.name,
                  );
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="navigate" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
                <Text style={styles.markerPopupBtnPrimaryText}>{t('capDetail.takeMeThere')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        );
      })()}

      {/* Navigation/Location Button - Fixed on Map, Moves with Bottom Sheet */}
      <Animated.View
        style={[
          styles.mapControlContainer,
          {
            bottom: bottomSheetHeight.interpolate({
              inputRange: [SNAP_POINTS.COLLAPSED, SNAP_POINTS.EXPANDED],
              outputRange: [SNAP_POINTS.COLLAPSED + 20, SNAP_POINTS.EXPANDED + 20],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        {/* +/- zoom buttons (stacked above the center-on-location button) */}
        <TouchableOpacity
          style={[styles.zoomControl, styles.zoomControlTop]}
          onPress={() => handleZoom(0.5)}
          activeOpacity={0.7}
          accessibilityLabel={t('dashboard.zoomIn', { defaultValue: 'Zoom in' })}
        >
          <Ionicons name="add" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.zoomControl, styles.zoomControlBottom]}
          onPress={() => handleZoom(2)}
          activeOpacity={0.7}
          accessibilityLabel={t('dashboard.zoomOut', { defaultValue: 'Zoom out' })}
        >
          <Ionicons name="remove" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mapControl}
          onPress={handleCenterOnLocation}
          activeOpacity={0.7}
        >
          <Ionicons name="navigate" size={24} color={COLORS.text} />
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
        {/* Drag Handle - drag to resize, tap to toggle collapsed/expanded */}
        <View
          style={styles.dragHandleContainer}
          hitSlop={{ top: 8, bottom: 12, left: 40, right: 40 }}
          accessibilityRole="adjustable"
          accessibilityLabel={t('dashboard.sheetHandleA11y')}
          {...panResponder.panHandlers}
        >
          <View style={styles.dragHandle} />
        </View>

        {/* Keyboard Avoiding View — also hosts the drag-to-collapse gesture */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          {...contentPanResponder.panHandlers}
        >
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
          keyboardShouldPersistTaps="handled"
          onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
        >
      {/* Nearby Capsules Section (Create lives in the always-visible tab-bar "+") */}
      <View style={styles.nearbyCapsules}>
        {/* Current location name */}
        <View style={styles.locationRow}>
          <Ionicons name="location" size={13} color={COLORS.ember} />
          <Text style={styles.locationName} numberOfLines={1}>{locationName}</Text>
        </View>
        {/* Header */}
        <View style={styles.nearbyHeader}>
          <View style={styles.nearbyHeaderTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nearbyTitle}>{t('dashboard.nearbyCaps')}</Text>
              <Text style={styles.nearbyCount}>
                {t('dashboard.postsCount', { count: capsules.filter(c => c.is_public).length })}
              </Text>
            </View>

            {/* Distance filter dropdown */}
            <View style={styles.distFilterWrap}>
              <TouchableOpacity
                style={[styles.distFilterBtn, distFilter != null && styles.distFilterBtnActive]}
                onPress={() => setDistMenuOpen((o) => !o)}
                activeOpacity={0.8}
              >
                <Ionicons name="options-outline" size={14} color={distFilter != null ? COLORS.ember : COLORS.text2} />
                <Text style={[styles.distFilterText, distFilter != null && styles.distFilterTextActive]}>
                  {distFilter == null ? t('dashboard.distanceFilter') : formatDistance(distFilter)}
                </Text>
                <Ionicons name={distMenuOpen ? 'chevron-up' : 'chevron-down'} size={12} color={COLORS.text3} />
              </TouchableOpacity>

              {distMenuOpen && (
                <View style={styles.distMenu}>
                  <TouchableOpacity
                    style={styles.distMenuItem}
                    onPress={() => { setDistFilter(null); setDistMenuOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.distMenuItemText, distFilter == null && styles.distMenuItemTextActive]}>
                      {t('dashboard.anyDistance')}
                    </Text>
                    {distFilter == null && <Ionicons name="checkmark" size={14} color={COLORS.ember} />}
                  </TouchableOpacity>
                  {DIST_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.distMenuItem}
                      onPress={() => { setDistFilter(opt); setDistMenuOpen(false); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.distMenuItemText, distFilter === opt && styles.distMenuItemTextActive]}>
                        {formatDistance(opt)}
                      </Text>
                      {distFilter === opt && <Ionicons name="checkmark" size={14} color={COLORS.ember} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
      </View>

        {/* Feed tabs: All / My Caps / Friends / Nearby / New / Popular */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {FEED_TABS.map((tab) => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tabChip, activeTab === tab && styles.tabChipActive]} activeOpacity={0.8}>
              <Text style={[styles.tabChipText, activeTab === tab && styles.tabChipTextActive]}>{t('dashboard.tab_' + tab)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Rich feed rows */}
        {loading ? (
          <View style={styles.feedLoadingContainer}>
            <ActivityIndicator size="large" color={COLORS.ember} />
          </View>
        ) : (() => {
          let feed = capsules.slice();
          if (activeTab === 'mine') feed = feed.filter((c) => c.owner_id === userId);
          else if (activeTab === 'friends') feed = feed.filter((c) => friendIds.has(c.owner_id) && c.is_public);
          // Public discovery tabs (All / Nearby / New / Popular) show only public caps.
          // The owner's own private caps (whispers, private gatherings) stay in "Mine".
          else feed = feed.filter((c) => c.is_public);
          // Apply the on-map cap-type filter to the feed rows too.
          if (typeFilter != null) feed = feed.filter((c) => c.type === typeFilter);
          let withD = feed.map((c) => ({
            cap: c,
            d: calculateDistance(userLocation.latitude, userLocation.longitude, c.displayLat || c.lat || userLocation.latitude, c.displayLng || c.lng || userLocation.longitude),
          }));
          // Apply the distance filter to the feed rows (Any = no cap).
          if (distFilter != null) withD = withD.filter((x) => x.d <= distFilter);
          if (activeTab === 'nearby') withD.sort((a, b) => a.d - b.d);
          else if (activeTab === 'popular') withD.sort((a, b) => (b.cap.view_count || 0) - (a.cap.view_count || 0));
          else withD.sort((a, b) => new Date(b.cap.created_at || 0).getTime() - new Date(a.cap.created_at || 0).getTime());

          if (!withD.length) {
            return (
              <View style={styles.feedEmptyState}>
                <Ionicons name="time-outline" size={56} color={COLORS.ember} />
                <Text style={styles.feedEmptyText}>{t('dashboard.emptyTitle')}</Text>
                <Text style={styles.feedEmptySubtext}>{t('dashboard.emptySubtitle')}</Text>
              </View>
            );
          }
          return (
            <View>
              {withD.map(({ cap, d }, index) => {
                const ct = getCapType(cap.type);
                const locked = isLocked(cap.open_at);
                const media = getMediaUrl(cap);
                const actor = '@' + (cap.profiles?.username || cap.profiles?.display_name || 'someone');
                const preview = (cap.description || '').trim();
                return (
                  <TouchableOpacity key={cap.id || index} style={styles.feedRow} onPress={() => handleMarkerPress(cap)} activeOpacity={0.7}>
                    <View style={[styles.feedAvatar, { backgroundColor: `${ct.color}22` }]}>
                      {media ? <Image source={{ uri: media }} style={styles.feedAvatarImg} /> : <CapTypeIcon size={22} color={ct.color} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.feedActor} numberOfLines={1}>
                        {t('dashboard.actorDropped', { user: actor, type: ct.name })}
                      </Text>
                      <Text style={styles.feedTitle} numberOfLines={1}>{cap.title || ct.name}</Text>
                      {preview ? (
                        <Text style={styles.feedPreview} numberOfLines={1}>{preview}</Text>
                      ) : null}
                      <Text style={styles.feedMeta} numberOfLines={1}>
                        <Text style={{ color: ct.color }}>{ct.name}</Text>
                        {cap.location_name ? `  ·  ${cap.location_name}` : ''}{`  ·  ${formatDistance(d)}`}
                        {cap.created_at ? `  ·  ${timeAgo(cap.created_at)}` : ''}
                      </Text>
                    </View>
                    <View style={styles.feedTrailing}>
                      <View style={[styles.feedBadge, { backgroundColor: locked ? 'rgba(232,99,58,0.15)' : 'rgba(61,155,122,0.15)' }]}>
                        <Text style={[styles.feedBadgeText, { color: locked ? COLORS.ember : COLORS.moss }]}>{locked ? t('dashboard.sealed') : t('dashboard.openNow')}</Text>
                      </View>
                      <CapTypeIcon size={16} color={ct.color} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })()}
      </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>

      <CapsuleDetailModal
        visible={showTimeModal}
        capsule={selectedCapsule}
        capsules={filteredCapsules}
        onClose={() => {
          setShowTimeModal(false);
          setSelectedCapsule(null);
        }}
        onOwnerPress={(owner) => {
          setShowTimeModal(false);
          onNavigate('FriendProfile', {
            friend: {
              id: owner.id,
              username: owner.username || '',
              display_name: owner.display_name || '',
              avatar_url: owner.avatar_url,
            }
          });
        }}
        onExplore={() => {
          setShowTimeModal(false);
          setSelectedCapsule(null);
          onNavigate('Explore');
        }}
      />


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
              <Ionicons name="close" size={18} color={COLORS.text2} />
        </TouchableOpacity>

            {/* Scrollable Content */}
            <ScrollView
              style={styles.inviteModalContent}
              contentContainerStyle={styles.inviteModalContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Image/Banner Area - Reserved for future asset */}
              <View style={styles.inviteModalImagePlaceholder}>
                <Ionicons name="gift" size={64} color={COLORS.ember} />
      </View>

              {/* Main Heading */}
              <Text style={styles.inviteModalTitle}>
                {t('dashboard.inviteTitle')}
              </Text>

              {/* Subtext */}
              <Text style={styles.inviteModalSubtext}>
                {t('dashboard.inviteSubtitle')}
              </Text>

              {/* Form Section */}
              <View style={styles.inviteModalForm}>
                <Text style={styles.inviteModalFormLabel}>{t('dashboard.inviteFormLabel')}</Text>
                <View style={styles.inviteModalInputContainer}>
                  <Ionicons name="person-add-outline" size={20} color={COLORS.text3} style={styles.inviteModalInputIcon} />
                  <TextInput
                    style={styles.inviteModalInput}
                    placeholder={t('dashboard.invitePlaceholder')}
                    placeholderTextColor={COLORS.text3}
                    value={inviteIdentifier}
                    onChangeText={setInviteIdentifier}
                    keyboardType="default"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <Text style={styles.inviteModalInputHint}>
                  {t('dashboard.inviteInputHint')}
                </Text>

                {/* Benefits Section */}
                <View style={styles.inviteModalBenefits}>
                  <View style={styles.inviteModalBenefitItem}>
                    <View style={styles.inviteModalBenefitIcon}>
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.moss} />
                    </View>
                    <Text style={styles.inviteModalBenefitText}>
                      {t('dashboard.benefit1')}
                    </Text>
                  </View>
                  <View style={styles.inviteModalBenefitItem}>
                    <View style={styles.inviteModalBenefitIcon}>
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.moss} />
                    </View>
                    <Text style={styles.inviteModalBenefitText}>
                      {t('dashboard.benefit2')}
                    </Text>
                  </View>
                  <View style={styles.inviteModalBenefitItem}>
                    <View style={styles.inviteModalBenefitIcon}>
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.moss} />
                    </View>
                    <Text style={styles.inviteModalBenefitText}>
                      {t('dashboard.benefit3')}
                    </Text>
                  </View>
                </View>

                {/* Invite Action Button */}
                <TouchableOpacity 
                  style={styles.inviteModalActionButton}
                  onPress={handleSendInvite}
                  activeOpacity={0.8}
                >
                  <Ionicons name="paper-plane" size={20} color={COLORS.white} style={styles.inviteModalActionButtonIcon} />
                  <Text style={styles.inviteModalActionButtonText}>{t('dashboard.sendInvitation')}</Text>
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
    backgroundColor: COLORS.bg,
  },
  msgFab: {
    position: 'absolute',
    right: SPACING.lg,
    zIndex: 30,
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
  map: {
    flex: 1,
  },
  mapControlContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 500,
  },
  mapControl: {
    backgroundColor: COLORS.card,
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  // Stacked +/- zoom buttons (sit above the center-on-location control)
  zoomControl: {
    backgroundColor: COLORS.card,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  zoomControlTop: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomWidth: 0,
  },
  zoomControlBottom: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    marginBottom: 12,
  },
  // "N nearby" overlay chip (top-left over the map)
  nearbyChip: {
    position: 'absolute',
    left: SPACING.lg,
    zIndex: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(20,20,22,0.8)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nearbyChipText: {
    ...font('micro'),
    color: COLORS.text,
    fontWeight: '700',
  },
  // On-map cap-type filter control + dropdown (top, left of the message FAB)
  typeFilterWrap: {
    position: 'absolute',
    right: SPACING.lg + 56, // sits left of the round message FAB
    zIndex: 40,
    alignItems: 'flex-end',
  },
  typeFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(20,20,22,0.85)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeFilterBtnActive: {
    borderColor: COLORS.emberGlow,
  },
  typeFilterText: {
    ...font('label'),
    color: COLORS.text2,
  },
  typeMenu: {
    marginTop: 6,
    minWidth: 150,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  typeMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  typeMenuItemText: {
    fontSize: 13,
    color: COLORS.text,
  },
  typeMenuItemTextActive: {
    color: COLORS.ember,
    fontWeight: '700',
  },
  typeMenuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  capsuleMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  calloutContainer: {
    width: 220,
    minHeight: 70,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  calloutTitle: {
    ...font('subtitle'),
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
    width: '100%',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.emberSoft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.emberGlow,
    minWidth: 140,
  },
  infoIcon: {
    marginRight: 6,
  },
  infoButtonText: {
    fontSize: 13,
    color: COLORS.ember,
    fontWeight: '600',
  },
  // Shared With Section - At Top of Content (Always Visible)
  // Nearby Capsules Section
  nearbyCapsules: {
    paddingBottom: 100, // Extra space for bottom tab bar
  },
  nearbyHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  nearbyHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nearbyTitle: {
    ...font('subtitle'),
    color: COLORS.text,
    marginBottom: 4,
  },
  nearbyCount: {
    fontSize: 13,
    color: COLORS.text2,
  },
  // Current-location row (above the nearby header)
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 2,
  },
  locationName: {
    fontSize: 11,
    color: COLORS.text3,
    flex: 1,
  },
  // Distance filter dropdown
  distFilterWrap: {
    position: 'relative',
    zIndex: 50,
  },
  distFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.bg3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  distFilterBtnActive: {
    backgroundColor: COLORS.emberSoft,
    borderColor: COLORS.emberGlow,
  },
  distFilterText: {
    ...font('label'),
    color: COLORS.text2,
  },
  distFilterTextActive: {
    color: COLORS.ember,
  },
  distMenu: {
    position: 'absolute',
    top: 38,
    right: 0,
    minWidth: 120,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 60,
  },
  distMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  distMenuItemText: {
    fontSize: 13,
    color: COLORS.text,
  },
  distMenuItemTextActive: {
    color: COLORS.ember,
    fontWeight: '700',
  },
  // Tabs (Top / Recent)
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: COLORS.ember,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text2,
  },
  tabTextActive: {
    color: COLORS.text,
  },
  // Grid Layout
  capsuleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 1,
  },
  gridItem: {
    width: width / 3,
    height: width / 3,
    position: 'relative',
    borderWidth: 0.5,
    borderColor: COLORS.bg,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridImagePlaceholder: {
    backgroundColor: COLORS.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLockedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  distanceBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 2,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  feedLoadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Feed tabs + rich rows (demo Home parity)
  tabsRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  tabChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.pill, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border },
  tabChipActive: { backgroundColor: COLORS.ember, borderColor: COLORS.ember },
  tabChipText: { ...font('label'), color: COLORS.text2 },
  tabChipTextActive: { color: COLORS.white },
  feedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  feedAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  feedAvatarImg: { width: '100%', height: '100%' },
  feedActor: { ...font('caption'), color: COLORS.text2, marginBottom: 2 },
  feedTitle: { ...font('bodyBold'), color: COLORS.text },
  feedPreview: { ...font('caption'), color: COLORS.text2, fontStyle: 'italic', marginTop: 2 },
  feedMeta: { ...font('caption'), color: COLORS.text2, marginTop: 2 },
  feedTrailing: { alignItems: 'center', gap: 6 },
  feedBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill },
  feedBadgeText: { ...font('micro') },
  // Map marker popup card (replaces the plain Callout)
  markerPopup: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 400,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  markerPopupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  markerPopupIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPopupTitle: {
    ...font('bodyBold'),
    color: COLORS.text,
  },
  markerPopupType: {
    ...font('caption'),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  markerPopupClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPopupActions: {
    flexDirection: 'row',
    gap: 10,
  },
  markerPopupBtnSecondary: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.bg3,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPopupBtnSecondaryText: {
    ...font('label'),
    color: COLORS.text,
  },
  markerPopupBtnPrimary: {
    flex: 2,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.ember,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPopupBtnPrimaryText: {
    ...font('label'),
    color: COLORS.white,
    fontWeight: '700',
  },
  feedEmptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  feedEmptyText: {
    ...font('subtitle'),
    color: COLORS.text2,
    marginTop: 16,
    marginBottom: 8,
  },
  feedEmptySubtext: {
    fontSize: 14,
    color: COLORS.text3,
    textAlign: 'center',
  },
  feedEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.ember,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  feedEmptyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  // Friends Section
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 100,
  },
  dragHandleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 14,
    paddingBottom: 14,
    minHeight: 44, // larger, easy-to-hit drag/tap target
  },
  dragHandle: {
    width: 44,
    height: 5,
    backgroundColor: COLORS.text2,
    borderRadius: 3,
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
    backgroundColor: COLORS.card,
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
    cursor: 'grab' as any,
  },
  inviteModalDragBar: {
    width: 40,
    height: 5,
    backgroundColor: COLORS.text3,
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
    backgroundColor: COLORS.bg3,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.bg3,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  inviteModalTitle: {
    ...font('display'),
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  inviteModalSubtext: {
    fontSize: 16,
    color: COLORS.text2,
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
    color: COLORS.text,
    marginBottom: 8,
  },
  inviteModalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg3,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  inviteModalInputHint: {
    fontSize: 12,
    color: COLORS.text3,
    marginBottom: 16,
    lineHeight: 16,
  },
  inviteModalInputIcon: {
    marginRight: 12,
  },
  inviteModalInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
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
    color: COLORS.text2,
    flex: 1,
  },
  inviteModalActionButton: {
    backgroundColor: COLORS.ember,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.ember,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  inviteModalActionButtonIcon: {
    marginRight: 8,
  },
  inviteModalActionButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default DashboardScreen;
