import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import MapView, { Marker } from 'react-native-maps';
import { CapsuleService, Capsule } from '../../services/capsuleService';
import { MediaService } from '../../services/mediaService';
import { supabase } from '../../lib/supabase';

interface CapsuleDetailsScreenProps {
  onBack: () => void;
  capsuleId?: string;
}

const { width } = Dimensions.get('window');

const CapsuleDetailsScreen = ({ onBack, capsuleId }: CapsuleDetailsScreenProps) => {
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharedUsers, setSharedUsers] = useState<any[]>([]); // Users capsule is shared with

  useEffect(() => {
    loadCapsule();
  }, [capsuleId]);

  const loadCapsule = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!capsuleId) {
        setError('No capsule ID provided');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await CapsuleService.getCapsule(capsuleId);

      if (fetchError || !data) {
        setError('Failed to load capsule');
        console.error('Error loading capsule:', fetchError);
      } else {
        setCapsule(data);
        
        // Fetch shared users info if capsule is private and has shared_with
        if (!data.is_public && data.shared_with && data.shared_with.length > 0) {
          await loadSharedUsers(data.shared_with);
        }
        
        // Increment view count
        await CapsuleService.incrementViewCount(capsuleId);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const loadSharedUsers = async (userIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);

      if (error) {
        console.error('Error loading shared users:', error);
        return;
      }

      setSharedUsers(data || []);
      console.log('📋 Loaded shared users:', data?.length || 0);
    } catch (error) {
      console.error('Error in loadSharedUsers:', error);
    }
  };

  const handleShare = () => {
    Alert.alert('Share Capsule', 'Share functionality will be available soon!');
  };

  const handleEdit = () => {
    Alert.alert('Edit Capsule', 'Edit functionality will be available soon!');
  };

  const handleDelete = async () => {
    if (!capsule) return;

    Alert.alert(
      'Delete Capsule',
      'Are you sure you want to delete this capsule? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete media from storage if exists
              if (capsule.media_url) {
                const path = MediaService.extractPathFromUrl(capsule.media_url);
                if (path) await MediaService.deleteMedia(path);
              }

              // Delete capsule from database
              const { error } = await CapsuleService.deleteCapsule(capsule.id);
              
              if (error) {
                Alert.alert('Error', 'Failed to delete capsule');
              } else {
                Alert.alert('Deleted', 'Capsule has been deleted');
                onBack();
              }
            } catch (error) {
              console.error('Error deleting capsule:', error);
              Alert.alert('Error', 'Failed to delete capsule');
            }
          }
        },
      ]
    );
  };

  const calculateDaysUntilOpen = (openDate: string | null): number => {
    if (!openDate) return 0;
    const now = new Date();
    const open = new Date(openDate);
    const diff = open.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getLocationString = (lat: number | null, lng: number | null): string => {
    if (!lat || !lng) return 'Location not set';
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Capsule Details</Text>
          <View style={styles.editButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FAC638" />
          <Text style={styles.loadingText}>Loading capsule...</Text>
        </View>
      </View>
    );
  }

  if (error || !capsule) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Capsule Details</Text>
          <View style={styles.editButton} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>{error || 'Capsule not found'}</Text>
          <TouchableOpacity onPress={onBack} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const daysUntilOpen = calculateDaysUntilOpen(capsule.open_at);
  const locationString = getLocationString(capsule.lat, capsule.lng);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Capsule Details</Text>
        <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
          <Ionicons name="pencil" size={24} color="#FAC638" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Top Section - Media Display */}
        <View style={styles.mediaContainer}>
          {capsule.media_url && capsule.media_type !== 'none' ? (
            <View style={styles.mediaWrapper}>
              <Image 
                source={{ uri: capsule.media_url }} 
                style={styles.heroMedia}
                resizeMode="cover"
              />
              {capsule.media_type === 'video' && !capsule.is_locked && (
                <View style={styles.playIconOverlay}>
                  <Ionicons name="play-circle" size={64} color="white" />
                </View>
              )}
              {capsule.is_locked && (
                <BlurView intensity={80} style={styles.blurOverlay}>
                  <View style={styles.lockedOverlay}>
                    <Ionicons name="lock-closed" size={48} color="white" />
                    <Text style={styles.lockedLabel}>Locked</Text>
                    <Text style={styles.lockedSubtext}>
                      {daysUntilOpen > 0 ? `Opens in ${daysUntilOpen} days` : 'Opening soon'}
                    </Text>
                  </View>
                </BlurView>
              )}
            </View>
          ) : (
            <View style={[styles.placeholderMedia, { backgroundColor: '#FAC638' }]}>
              <Ionicons name="time-outline" size={80} color="white" />
            </View>
          )}
        </View>

        {/* Textual Content */}
        <View style={styles.contentSection}>
          <View style={styles.titleRow}>
            <Text style={styles.capsuleTitle}>{capsule.title}</Text>
            {capsule.is_public && (
              <View style={styles.publicBadge}>
                <Ionicons name="globe-outline" size={16} color="#06D6A0" />
                <Text style={styles.publicBadgeText}>Public</Text>
              </View>
            )}
          </View>
          <Text style={styles.capsuleDescription}>
            {capsule.description || 'No description provided'}
          </Text>
          {capsule.view_count !== undefined && capsule.view_count > 0 && (
            <View style={styles.viewCountContainer}>
              <Ionicons name="eye-outline" size={16} color="#94a3b8" />
              <Text style={styles.viewCountText}>
                {capsule.view_count} {capsule.view_count === 1 ? 'view' : 'views'}
              </Text>
            </View>
          )}
        </View>

        {/* Meta Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={20} color="#94a3b8" />
              <View style={styles.metaTextContainer}>
                <Text style={styles.metaLabel}>Created On</Text>
                <Text style={styles.metaValue}>{formatDate(capsule.created_at)}</Text>
              </View>
            </View>
            {capsule.open_at && (
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={20} color="#94a3b8" />
                <View style={styles.metaTextContainer}>
                  <Text style={styles.metaLabel}>Opens On</Text>
                  <Text style={styles.metaValue}>{formatDate(capsule.open_at)}</Text>
                </View>
              </View>
            )}
            {(capsule.lat && capsule.lng) && (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={20} color="#94a3b8" />
                <View style={styles.metaTextContainer}>
                  <Text style={styles.metaLabel}>Location</Text>
                  <Text style={styles.metaValue}>{locationString}</Text>
                </View>
              </View>
            )}
            {capsule.is_locked && (
              <View style={styles.metaRow}>
                <Ionicons name="lock-closed-outline" size={20} color="#FAC638" />
                <View style={styles.metaTextContainer}>
                  <Text style={styles.metaLabel}>Status</Text>
                  <Text style={[styles.metaValue, styles.lockedStatus]}>
                    Locked - {daysUntilOpen > 0 ? `Opens in ${daysUntilOpen} days` : 'Opening soon'}
                  </Text>
                </View>
              </View>
            )}
            {!capsule.is_public && sharedUsers.length > 0 && (
              <View style={styles.metaRow}>
                <Ionicons name="people-outline" size={20} color="#94a3b8" />
                <View style={styles.metaTextContainer}>
                  <Text style={styles.metaLabel}>Shared With</Text>
                  <View style={styles.sharedUsersContainer}>
                    {sharedUsers.map((user, index) => (
                      <View key={user.id} style={styles.sharedUserChip}>
                        {user.avatar_url ? (
                          <Image source={{ uri: user.avatar_url }} style={styles.sharedUserAvatar} />
                        ) : (
                          <View style={[styles.sharedUserAvatar, styles.sharedUserAvatarPlaceholder]}>
                            <Ionicons name="person" size={12} color="#94a3b8" />
                          </View>
                        )}
                        <Text style={styles.sharedUserText}>
                          @{user.username}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Mini Map */}
        {capsule.lat && capsule.lng && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Drop Location</Text>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: capsule.lat,
                  longitude: capsule.lng,
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
                    latitude: capsule.lat,
                    longitude: capsule.lng,
                  }}
                  title={capsule.title}
                >
                  <View style={styles.customMarker}>
                    <Ionicons name="location" size={24} color="white" />
                  </View>
                </Marker>
              </MapView>
            </View>
          </View>
        )}

        {/* Delete Button */}
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
          <Text style={styles.deleteText}>Delete Capsule</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  // Media Section Styles
  mediaContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#1e293b',
  },
  mediaWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  heroMedia: {
    width: '100%',
    height: '100%',
  },
  playIconOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -32 }, { translateY: -32 }],
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedLabel: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    marginTop: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  lockedSubtext: {
    fontSize: 16,
    color: 'white',
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  placeholderMedia: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 80,
  },
  // Content Section Styles
  contentSection: {
    padding: 20,
    backgroundColor: 'white',
  },
  capsuleTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  capsuleDescription: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
  },
  // Shared With Section
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  sharedWithContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  avatarItem: {
    alignItems: 'center',
    width: 70,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FAC638',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatarCurrent: {
    borderWidth: 3,
    borderColor: '#06D6A0',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  avatarName: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
  },
  sharedWithYouBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  sharedWithYouText: {
    fontSize: 14,
    color: '#06D6A0',
    fontWeight: '600',
  },
  // Meta Information Styles
  metaInfo: {
    gap: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  metaTextContainer: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  // Map Styles
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  customMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FAC638',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerEmoji: {
    fontSize: 24,
  },
  // Delete Button
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    margin: 20,
    marginTop: 1,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  bottomSpacer: {
    height: 20,
  },
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  errorButton: {
    marginTop: 24,
    backgroundColor: '#FAC638',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  // Title Row
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 214, 160, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  publicBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#06D6A0',
  },
  viewCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  viewCountText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  lockedStatus: {
    color: '#FAC638',
    fontWeight: '600',
  },
  sharedUsersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  sharedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sharedUserAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  sharedUserAvatarPlaceholder: {
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sharedUserText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
});

export default CapsuleDetailsScreen;
