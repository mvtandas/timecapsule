import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import MapView, { Marker } from 'react-native-maps';

interface CapsuleDetailsScreenProps {
  onBack: () => void;
}

const { width } = Dimensions.get('window');

const CapsuleDetailsScreen = ({ onBack }: CapsuleDetailsScreenProps) => {
  const capsule = {
    title: 'Beach Memories',
    description: 'A wonderful day at the beach with friends. The sun was shining, waves were perfect, and we had the best time!',
    openDate: '2025-12-25',
    createdDate: '2024-10-18',
    location: 'Santa Monica Beach, CA',
    isLocked: false, // Change to false to see unlocked state
    daysUntilOpen: 68,
    emoji: '🏖️',
    color: '#FFD166',
    mediaUri: 'https://picsum.photos/400/600?random=1', // Main media for top display
    mediaType: 'image', // or 'video'
    media: [
      { id: '1', type: 'image', uri: 'https://picsum.photos/400/300?random=1' },
      { id: '2', type: 'image', uri: 'https://picsum.photos/400/300?random=2' },
      { id: '3', type: 'video', uri: 'https://picsum.photos/400/300?random=3' },
    ],
    sharedWith: [
      { id: '1', name: 'Sarah Johnson', email: 'sarah@example.com', avatar: null, isCurrentUser: false },
      { id: '2', name: 'Mike Chen', email: 'mike@example.com', avatar: null, isCurrentUser: false },
      { id: '3', name: 'You', email: 'you@example.com', avatar: null, isCurrentUser: true },
    ],
    sharedOn: '2024-10-18T14:30:00Z',
    sharedLocation: 'Santa Monica Beach, CA',
    coordinates: {
      latitude: 34.0195,
      longitude: -118.4912,
    },
  };

  const handleShare = () => {
    Alert.alert('Share Capsule', 'Share functionality will be available soon!');
  };

  const handleEdit = () => {
    Alert.alert('Edit Capsule', 'Edit functionality will be available soon!');
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Capsule',
      'Are you sure you want to delete this capsule? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Deleted', 'Capsule has been deleted');
            onBack();
          }
        },
      ]
    );
  };

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
          {capsule.mediaUri ? (
            <View style={styles.mediaWrapper}>
              <Image 
                source={{ uri: capsule.mediaUri }} 
                style={styles.heroMedia}
                resizeMode="cover"
              />
              {capsule.mediaType === 'video' && !capsule.isLocked && (
                <View style={styles.playIconOverlay}>
                  <Ionicons name="play-circle" size={64} color="white" />
                </View>
              )}
              {capsule.isLocked && (
                <BlurView intensity={80} style={styles.blurOverlay}>
                  <View style={styles.lockedOverlay}>
                    <Ionicons name="lock-closed" size={48} color="white" />
                    <Text style={styles.lockedLabel}>Locked</Text>
                    <Text style={styles.lockedSubtext}>Opens in {capsule.daysUntilOpen} days</Text>
                  </View>
                </BlurView>
              )}
            </View>
          ) : (
            <View style={[styles.placeholderMedia, { backgroundColor: capsule.color }]}>
              <Text style={styles.placeholderEmoji}>{capsule.emoji}</Text>
            </View>
          )}
        </View>

        {/* Textual Content */}
        <View style={styles.contentSection}>
          <Text style={styles.capsuleTitle}>{capsule.title}</Text>
          <Text style={styles.capsuleDescription}>{capsule.description}</Text>
        </View>

        {/* Sharing Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shared With</Text>
          <View style={styles.sharedWithContainer}>
            {capsule.sharedWith.map((person) => (
              <View key={person.id} style={styles.avatarItem}>
                <View style={[
                  styles.avatar,
                  person.isCurrentUser && styles.avatarCurrent
                ]}>
                  {person.avatar ? (
                    <Image source={{ uri: person.avatar }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>
                      {person.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={styles.avatarName} numberOfLines={1}>
                  {person.isCurrentUser ? 'You' : person.name.split(' ')[0]}
                </Text>
              </View>
            ))}
          </View>
          {capsule.sharedWith.some(p => p.isCurrentUser) && (
            <View style={styles.sharedWithYouBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#06D6A0" />
              <Text style={styles.sharedWithYouText}>Shared with you</Text>
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
                <Text style={styles.metaLabel}>Shared On</Text>
                <Text style={styles.metaValue}>{formatDate(capsule.sharedOn)}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={20} color="#94a3b8" />
              <View style={styles.metaTextContainer}>
                <Text style={styles.metaLabel}>Shared Location</Text>
                <Text style={styles.metaValue}>{capsule.sharedLocation}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={20} color="#94a3b8" />
              <View style={styles.metaTextContainer}>
                <Text style={styles.metaLabel}>Opens On</Text>
                <Text style={styles.metaValue}>{capsule.openDate}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Mini Map */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Drop Location</Text>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: capsule.coordinates.latitude,
                longitude: capsule.coordinates.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Marker
                coordinate={capsule.coordinates}
                title={capsule.title}
              >
                <View style={styles.customMarker}>
                  <Text style={styles.markerEmoji}>{capsule.emoji}</Text>
                </View>
              </Marker>
            </MapView>
          </View>
        </View>

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
});

export default CapsuleDetailsScreen;
