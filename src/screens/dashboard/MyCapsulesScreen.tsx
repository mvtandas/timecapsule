import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, RefreshControl, Modal, Animated, Dimensions, PanResponder, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import MapView, { Marker } from 'react-native-maps';
import { CapsuleService } from '../../services/capsuleService';

const { width, height } = Dimensions.get('window');

interface MyCapsulesScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onLogout?: () => void;
}

const MyCapsulesScreen = ({ onNavigate }: MyCapsulesScreenProps) => {
  const [activeTab, setActiveTab] = useState<'created' | 'shared'>('created');
  const [capsules, setCapsules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Detail modal state
  const [selectedCapsule, setSelectedCapsule] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const DETAIL_MODAL_HEIGHT = height * 0.9;
  const detailModalTranslateY = useRef(new Animated.Value(DETAIL_MODAL_HEIGHT)).current;
  const detailModalBackdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadCapsules();
  }, [activeTab]);

  const loadCapsules = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'created') {
        const { data, error } = await CapsuleService.getUserCapsules();
        if (error) {
          console.error('Error loading capsules:', error);
          Alert.alert('Error', 'Failed to load capsules');
        } else {
          setCapsules(data || []);
        }
      } else {
        const { data, error } = await CapsuleService.getSharedCapsules();
        if (error) {
          console.error('Error loading shared capsules:', error);
        } else {
          setCapsules(data || []);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCapsules();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No open date';
    
    const openDate = new Date(dateString);
    const now = new Date();
    const diff = openDate.getTime() - now.getTime();
    
    if (diff < 0) {
      return `Opened on ${openDate.toLocaleDateString()}`;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `Opens in ${days}d ${hours}h`;
    } else {
      return `Opens in ${hours}h`;
    }
  };

  const isLocked = (dateString: string | null) => {
    if (!dateString) return false;
    return new Date(dateString).getTime() > new Date().getTime();
  };

  const getRandomIcon = () => {
    const icons = ['🏖️', '👨‍👩‍👧‍👦', '🎓', '🎉', '🎂', '🌴', '🎸', '📸', '✈️', '🎨'];
    return icons[Math.floor(Math.random() * icons.length)];
  };

  const getRandomColor = () => {
    const colors = ['#FFD166', '#06D6A0', '#FF6B6B', '#4ECDC4', '#95E1D3'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleCapsuleTap = (capsule: any) => {
    setSelectedCapsule(capsule);
    openDetailModal();
  };

  const openDetailModal = () => {
    setShowDetailModal(true);
    Animated.parallel([
      Animated.timing(detailModalBackdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(detailModalTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
    ]).start();
  };

  const closeDetailModal = () => {
    Animated.parallel([
      Animated.timing(detailModalBackdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(detailModalTranslateY, {
        toValue: DETAIL_MODAL_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowDetailModal(false);
      setSelectedCapsule(null);
    });
  };

  const isCapsuleLocked = (capsule: any): boolean => {
    if (!capsule?.open_at) return false;
    return new Date(capsule.open_at).getTime() > new Date().getTime();
  };

  const getTimeComponents = (dateString: string | null) => {
    if (!dateString) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const openDate = new Date(dateString);
    const now = new Date();
    const diff = openDate.getTime() - now.getTime();
    
    if (diff < 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds };
  };

  // PanResponder for drag-to-dismiss on detail modal
  // Only triggers from the drag handle, not the scrollable content
  const detailModalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture downward drags that start near the top
        return gestureState.dy > 10 && Math.abs(gestureState.dx) < 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          detailModalTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          closeDetailModal();
        } else {
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

  const handleDeleteCapsule = (capsuleId: string, title: string, event: any) => {
    // Stop propagation to prevent triggering the capsule tap
    event?.stopPropagation?.();
    
    Alert.alert(
      'Delete Capsule',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await CapsuleService.deleteCapsule(capsuleId);
            if (error) {
              Alert.alert('Error', 'Failed to delete capsule');
            } else {
              Alert.alert('Success', 'Capsule deleted successfully');
              loadCapsules(); // Reload the list
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('Dashboard')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Capsules</Text>
        <TouchableOpacity onPress={() => onNavigate('Create')} style={styles.addButton}>
          <Ionicons name="add-circle" size={32} color="#FAC638" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setActiveTab('created')}
            style={[styles.tab, activeTab === 'created' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'created' && styles.activeTabText]}>
              Created
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('shared')}
            style={[styles.tab, activeTab === 'shared' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'shared' && styles.activeTabText]}>
              Shared
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Capsules List */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FAC638']} />
        }
        scrollEventThrottle={16}
        decelerationRate="normal"
        bounces={true}
        overScrollMode="auto"
        showsVerticalScrollIndicator={true}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FAC638" />
            <Text style={styles.loadingText}>Loading capsules...</Text>
          </View>
        ) : capsules.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-outline" size={80} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>
              {activeTab === 'created' ? 'No Capsules Yet' : 'No Shared Capsules'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'created' 
                ? 'Tap the + button to create your first time capsule!'
                : 'Capsules shared with you will appear here'}
            </Text>
          </View>
        ) : (
          capsules.map((capsule) => (
            <TouchableOpacity
              key={capsule.id}
              style={styles.capsuleCard}
              onPress={() => handleCapsuleTap(capsule)}
              activeOpacity={0.7}
            >
              <View style={styles.capsuleContent}>
                <View style={[styles.iconWrapper, { backgroundColor: getRandomColor() }]}>
                  <Text style={styles.iconText}>{getRandomIcon()}</Text>
                </View>
                <View style={styles.capsuleInfo}>
                  <Text style={styles.capsuleTitle}>{capsule.title}</Text>
                  <Text style={styles.capsuleTime}>{formatDate(capsule.open_at)}</Text>
                  {capsule.description && (
                    <Text style={styles.capsuleDescription} numberOfLines={1}>
                      {capsule.description}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.capsuleActions}>
                <Ionicons
                  name={isLocked(capsule.open_at) ? 'lock-closed' : 'lock-open'}
                  size={24}
                  color={isLocked(capsule.open_at) ? '#FF6B6B' : '#06D6A0'}
                  style={styles.lockIcon}
                />
                {activeTab === 'created' && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteCapsule(capsule.id, capsule.title, e);
                    }}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Capsule Detail Modal */}
      <Modal
        visible={showDetailModal}
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
              onPress={closeDetailModal}
              activeOpacity={1}
            />
          </Animated.View>

          {/* Bottom Sheet */}
          <Animated.View
            style={[
              styles.detailModalSheet,
              {
                height: DETAIL_MODAL_HEIGHT,
                transform: [{ translateY: detailModalTranslateY }],
              },
            ]}
          >
            {/* Drag Handle */}
            <View 
              style={styles.detailModalDragHandle}
              {...detailModalPanResponder.panHandlers}
            >
              <View style={styles.detailModalDragIndicator} />
            </View>

            {/* Close Button */}
            <TouchableOpacity 
              style={styles.detailModalCloseButton}
              onPress={closeDetailModal}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>

            {/* Content */}
            <ScrollView 
              style={styles.detailModalContent}
              contentContainerStyle={styles.detailModalContentContainer}
              showsVerticalScrollIndicator={true}
              scrollEnabled={true}
              bounces={true}
            >
              {/* Media Section */}
              <View style={styles.detailModalMediaSection}>
                {(() => {
                  // Get the first media item from content_refs
                  const contentRefs = selectedCapsule?.content_refs;
                  const hasMedia = contentRefs && contentRefs.length > 0;
                  
                  if (!hasMedia) {
                    return (
                      <View style={styles.detailModalMediaPlaceholder}>
                        <Ionicons name="image-outline" size={48} color="#cbd5e1" />
                        <Text style={styles.detailModalMediaPlaceholderText}>No media attached</Text>
                      </View>
                    );
                  }

                  // Get first media item - can be string URL or object with file_url
                  const firstMedia = contentRefs[0];
                  const mediaUrl = typeof firstMedia === 'string' ? firstMedia : firstMedia?.file_url || firstMedia?.uri;
                  const mediaType = typeof firstMedia === 'object' ? firstMedia?.content_type || firstMedia?.type : null;
                  
                  // Determine if it's a video
                  const isVideo = mediaType === 'video' || 
                                  (typeof mediaUrl === 'string' && (
                                    mediaUrl.includes('.mp4') || 
                                    mediaUrl.includes('.mov') || 
                                    mediaUrl.includes('.avi')
                                  ));

                  if (!mediaUrl) {
                    return (
                      <View style={styles.detailModalMediaPlaceholder}>
                        <Ionicons name="image-outline" size={48} color="#cbd5e1" />
                        <Text style={styles.detailModalMediaPlaceholderText}>Media unavailable</Text>
                      </View>
                    );
                  }

                  return (
                    <View style={styles.detailModalMediaContainer}>
                      {isVideo ? (
                        <View style={styles.detailModalMediaVideoContainer}>
                          <Ionicons name="play-circle" size={64} color="#ffffff" style={styles.detailModalVideoIcon} />
                          <Image 
                            source={{ uri: mediaUrl }}
                            style={styles.detailModalMediaImage}
                            resizeMode="cover"
                          />
                        </View>
                      ) : (
                        <Image 
                          source={{ uri: mediaUrl }}
                          style={styles.detailModalMediaImage}
                          resizeMode="cover"
                        />
                      )}
                      
                      {isCapsuleLocked(selectedCapsule) && (
                        <BlurView intensity={80} style={styles.detailModalMediaBlur}>
                          <View style={styles.detailModalMediaLockedBadge}>
                            <Ionicons name="lock-closed" size={32} color="#ffffff" />
                            <Text style={styles.detailModalMediaLockedText}>Locked</Text>
                            <Text style={styles.detailModalMediaLockedSubtext}>
                              Unlocks on {new Date(selectedCapsule.open_at || '').toLocaleDateString()}
                            </Text>
                          </View>
                        </BlurView>
                      )}
                    </View>
                  );
                })()}
              </View>

              <View style={styles.detailModalTextContent}>
                {/* Title */}
                <Text style={styles.detailModalTitle}>
                  {selectedCapsule?.title || 'Untitled Capsule'}
                </Text>

                {/* Description */}
                {selectedCapsule?.description && (
                  <Text style={styles.detailModalDescription}>
                    {selectedCapsule.description}
                  </Text>
                )}

                {/* Countdown Timer (if locked) */}
                {isCapsuleLocked(selectedCapsule) && selectedCapsule?.open_at && (
                  <View style={styles.detailModalCountdownContainer}>
                    <Text style={styles.detailModalCountdownLabel}>Opens in</Text>
                    <View style={styles.detailModalCountdownGrid}>
                      {(() => {
                        const time = getTimeComponents(selectedCapsule.open_at);
                        return (
                          <>
                            <View style={styles.detailModalCountdownItem}>
                              <Text style={styles.detailModalCountdownValue}>{time.days}</Text>
                              <Text style={styles.detailModalCountdownUnit}>Days</Text>
                            </View>
                            <View style={styles.detailModalCountdownItem}>
                              <Text style={styles.detailModalCountdownValue}>{time.hours}</Text>
                              <Text style={styles.detailModalCountdownUnit}>Hours</Text>
                            </View>
                            <View style={styles.detailModalCountdownItem}>
                              <Text style={styles.detailModalCountdownValue}>{time.minutes}</Text>
                              <Text style={styles.detailModalCountdownUnit}>Mins</Text>
                            </View>
                          </>
                        );
                      })()}
                    </View>
                  </View>
                )}

                {/* Shared With Section */}
                <View style={styles.detailModalSection}>
                  <Text style={styles.detailModalSectionTitle}>Shared With</Text>
                  <View style={styles.detailModalSharedContainer}>
                    {selectedCapsule?.is_public ? (
                      <View style={styles.detailModalPublicBadge}>
                        <Ionicons name="globe-outline" size={20} color="#64748b" />
                        <Text style={styles.detailModalPublicText}>This capsule is public</Text>
                      </View>
                    ) : (
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.detailModalSharedList}
                      >
                        {/* Mock shared users - replace with actual data */}
                        {[1, 2, 3].map((item, index) => (
                          <View key={index} style={styles.detailModalSharedUser}>
                            <View style={styles.detailModalSharedAvatar}>
                              <Ionicons name="person" size={20} color="#94a3b8" />
                            </View>
                            <Text style={styles.detailModalSharedName}>User {item}</Text>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                </View>

                {/* Meta Information */}
                <View style={styles.detailModalSection}>
                  <Text style={styles.detailModalSectionTitle}>Details</Text>
                  <View style={styles.detailModalMetaContainer}>
                    <View style={styles.detailModalMetaRow}>
                      <Ionicons name="calendar-outline" size={20} color="#64748b" />
                      <View style={styles.detailModalMetaTextContainer}>
                        <Text style={styles.detailModalMetaLabel}>Shared On</Text>
                        <Text style={styles.detailModalMetaValue}>
                          {selectedCapsule?.created_at 
                            ? new Date(selectedCapsule.created_at).toLocaleString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })
                            : 'Unknown'}
                        </Text>
                      </View>
                    </View>
                    
                    {selectedCapsule?.open_at && (
                      <View style={styles.detailModalMetaRow}>
                        <Ionicons name="time-outline" size={20} color="#64748b" />
                        <View style={styles.detailModalMetaTextContainer}>
                          <Text style={styles.detailModalMetaLabel}>Opens On</Text>
                          <Text style={styles.detailModalMetaValue}>
                            {new Date(selectedCapsule.open_at).toLocaleString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </Text>
                        </View>
                      </View>
                    )}

                    {(selectedCapsule?.lat && selectedCapsule?.lng) && (
                      <View style={styles.detailModalMetaRow}>
                        <Ionicons name="location-outline" size={20} color="#64748b" />
                        <View style={styles.detailModalMetaTextContainer}>
                          <Text style={styles.detailModalMetaLabel}>Shared Location</Text>
                          <Text style={styles.detailModalMetaValue}>
                            {selectedCapsule.lat.toFixed(4)}, {selectedCapsule.lng.toFixed(4)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>

                {/* Mini Map */}
                {(selectedCapsule?.lat && selectedCapsule?.lng) && (
                  <View style={styles.detailModalSection}>
                    <Text style={styles.detailModalSectionTitle}>Drop Location</Text>
                    <View style={styles.detailModalMapContainer}>
                      <MapView
                        style={styles.detailModalMiniMap}
                        initialRegion={{
                          latitude: selectedCapsule.lat,
                          longitude: selectedCapsule.lng,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        }}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        pitchEnabled={false}
                        rotateEnabled={false}
                      >
                        <Marker
                          coordinate={{
                            latitude: selectedCapsule.lat,
                            longitude: selectedCapsule.lng,
                          }}
                        >
                          <View style={styles.detailModalMapMarker}>
                            <Ionicons name="location" size={32} color="#FAC638" />
                          </View>
                        </Marker>
                      </MapView>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Share Button - Fixed at bottom */}
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 4,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8f8f5',
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FAC638',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
  },
  activeTabText: {
    fontWeight: '700',
    color: '#FAC638',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  capsuleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  capsuleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 28,
  },
  capsuleInfo: {
    flex: 1,
  },
  capsuleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  capsuleTime: {
    fontSize: 14,
    color: '#94a3b8',
  },
  capsuleDescription: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 2,
  },
  capsuleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockIcon: {
    marginRight: 0,
  },
  deleteButton: {
    padding: 4,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Detail Modal Styles
  detailModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  detailModalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  detailModalDragHandle: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignSelf: 'stretch',
  },
  detailModalDragIndicator: {
    width: 48,
    height: 5,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
  },
  detailModalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  detailModalContent: {
    flex: 1,
  },
  detailModalContentContainer: {
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
    flexGrow: 1,
  },
  detailModalMediaSection: {
    width: '100%',
  },
  detailModalMediaContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#f1f5f9',
    position: 'relative',
  },
  detailModalMediaImage: {
    width: '100%',
    height: '100%',
  },
  detailModalMediaVideoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  detailModalVideoIcon: {
    position: 'absolute',
    zIndex: 2,
    opacity: 0.8,
  },
  detailModalMediaBlur: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  detailModalMediaLockedBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 28,
    paddingVertical: 20,
    borderRadius: 20,
    maxWidth: width * 0.8,
  },
  detailModalMediaLockedText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 12,
  },
  detailModalMediaLockedSubtext: {
    fontSize: 13,
    color: '#e2e8f0',
    marginTop: 8,
    textAlign: 'center',
  },
  detailModalMediaPlaceholder: {
    width: '100%',
    height: 250,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailModalMediaPlaceholderText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  detailModalTextContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  detailModalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  detailModalDescription: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    marginBottom: 24,
  },
  detailModalCountdownContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  detailModalCountdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    textAlign: 'center',
  },
  detailModalCountdownGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailModalCountdownItem: {
    alignItems: 'center',
  },
  detailModalCountdownValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FAC638',
    marginBottom: 4,
  },
  detailModalCountdownUnit: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  detailModalConditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  detailModalConditionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#06D6A0',
  },
  detailModalConditionValue: {
    fontSize: 14,
    color: '#64748b',
  },
  detailModalSection: {
    marginBottom: 24,
  },
  detailModalSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  detailModalSharedContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  detailModalPublicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailModalPublicText: {
    fontSize: 14,
    color: '#64748b',
  },
  detailModalSharedList: {
    gap: 16,
  },
  detailModalSharedUser: {
    alignItems: 'center',
    gap: 6,
  },
  detailModalSharedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailModalSharedName: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  detailModalMetaContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  detailModalMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailModalMetaTextContainer: {
    flex: 1,
  },
  detailModalMetaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailModalMetaValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  detailModalMapContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  detailModalMiniMap: {
    flex: 1,
  },
  detailModalMapMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    zIndex: 1001,
  },
  detailModalShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAC638',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  detailModalShareIcon: {
    marginRight: 4,
  },
  detailModalShareText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
});

export default MyCapsulesScreen;
