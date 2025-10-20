import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CapsuleDetailsScreenProps {
  onBack: () => void;
}

const CapsuleDetailsScreen = ({ onBack }: CapsuleDetailsScreenProps) => {
  const capsule = {
    title: 'Beach Memories',
    description: 'A wonderful day at the beach with friends. The sun was shining, waves were perfect, and we had the best time!',
    openDate: '2025-12-25',
    createdDate: '2024-10-18',
    location: 'Santa Monica Beach, CA',
    isLocked: true,
    daysUntilOpen: 68,
    emoji: '🏖️',
    color: '#FFD166',
    media: [
      { id: '1', type: 'image', uri: 'https://picsum.photos/400/300?random=1' },
      { id: '2', type: 'image', uri: 'https://picsum.photos/400/300?random=2' },
      { id: '3', type: 'video', uri: 'https://picsum.photos/400/300?random=3' },
    ],
    sharedWith: [
      { id: '1', name: 'Sarah Johnson', email: 'sarah@example.com' },
      { id: '2', name: 'Mike Chen', email: 'mike@example.com' },
    ],
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

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Capsule Header */}
        <View style={styles.capsuleHeader}>
          <View style={[styles.iconWrapper, { backgroundColor: capsule.color }]}>
            <Text style={styles.iconText}>{capsule.emoji}</Text>
          </View>
          <Text style={styles.capsuleTitle}>{capsule.title}</Text>
          
          {capsule.isLocked ? (
            <View style={styles.lockedBadge}>
              <Ionicons name="lock-closed" size={16} color="white" />
              <Text style={styles.lockedText}>Opens in {capsule.daysUntilOpen} days</Text>
            </View>
          ) : (
            <View style={[styles.lockedBadge, styles.unlockedBadge]}>
              <Ionicons name="lock-open" size={16} color="white" />
              <Text style={styles.lockedText}>Unlocked</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Message</Text>
          <Text style={styles.description}>{capsule.description}</Text>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={20} color="#94a3b8" />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Open Date</Text>
                <Text style={styles.detailValue}>{capsule.openDate}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={20} color="#94a3b8" />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{capsule.location}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={20} color="#94a3b8" />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Created</Text>
                <Text style={styles.detailValue}>{capsule.createdDate}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Media */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Media ({capsule.media.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
            {capsule.media.map((item) => (
              <TouchableOpacity key={item.id} style={styles.mediaItem}>
                <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                {item.type === 'video' && (
                  <View style={styles.playIcon}>
                    <Ionicons name="play-circle" size={40} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addMediaButton}>
              <Ionicons name="add-circle-outline" size={40} color="#FAC638" />
              <Text style={styles.addMediaText}>Add More</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Shared With */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shared With ({capsule.sharedWith.length})</Text>
            <TouchableOpacity onPress={handleShare}>
              <Ionicons name="person-add-outline" size={24} color="#FAC638" />
            </TouchableOpacity>
          </View>
          {capsule.sharedWith.map((person) => (
            <View key={person.id} style={styles.personItem}>
              <View style={styles.personAvatar}>
                <Ionicons name="person" size={24} color="white" />
              </View>
              <View style={styles.personInfo}>
                <Text style={styles.personName}>{person.name}</Text>
                <Text style={styles.personEmail}>{person.email}</Text>
              </View>
              <TouchableOpacity>
                <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          ))}
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
  contentContainer: {
    padding: 16,
  },
  capsuleHeader: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 40,
  },
  capsuleTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  unlockedBadge: {
    backgroundColor: '#06D6A0',
  },
  lockedText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
  },
  detailsGrid: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  mediaScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  mediaItem: {
    width: 150,
    height: 150,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  playIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  addMediaButton: {
    width: 150,
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f5',
  },
  addMediaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAC638',
    marginTop: 8,
  },
  personItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  personAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FAC638',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  personEmail: {
    fontSize: 14,
    color: '#94a3b8',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 8,
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
