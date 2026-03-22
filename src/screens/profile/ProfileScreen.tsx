import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  Dimensions,
  RefreshControl,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { CapsuleService } from '../../services/capsuleService';
import { MediaService } from '../../services/mediaService';
import { supabase } from '../../lib/supabase';
import CapsuleDetailModal from '../../components/CapsuleDetailModal';
import { timeAgo } from '../../utils/dateUtils';
import { getMediaUrl } from '../../utils/mediaUtils';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2; // 2 columns

interface ProfileScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onLogout: () => void;
}

const ProfileScreen = ({ onNavigate }: ProfileScreenProps) => {
  const { user } = useAuthStore();
  const [capsulesCount, setCapsulesCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [daysActive, setDaysActive] = useState(0);
  const [capsulesList, setCapsulesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(user?.avatar_url || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedCapsule, setSelectedCapsule] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (user?.avatar_url) setProfilePhoto(user.avatar_url);
  }, [user?.avatar_url]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await CapsuleService.getUserCapsules();

      if (!error && data) {
        setCapsulesCount(data.length);
        setCapsulesList(data);
        if (data.length > 0) {
          const oldest = new Date(data[data.length - 1].created_at);
          setDaysActive(Math.floor((Date.now() - oldest.getTime()) / 86400000));
        }
      }

      if (user?.id) {
        const { data: fd } = await supabase
          .from('friend_requests')
          .select('id')
          .eq('status', 'accepted')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
        setFriendsCount(fd?.length || 0);
      }
    } catch (e) { if (__DEV__) console.warn('loadStats:', e); } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const handleAvatarPress = () => setPhotoPickerVisible(true);

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Camera permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) { setPhotoPickerVisible(false); await uploadAndUpdateAvatar(result.assets[0].uri); }
  };

  const handleChooseFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Gallery permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) { setPhotoPickerVisible(false); await uploadAndUpdateAvatar(result.assets[0].uri); }
  };

  const uploadAndUpdateAvatar = async (imageUri: string) => {
    if (!user?.id) return;
    try {
      setUploadingPhoto(true);
      setProfilePhoto(imageUri);
      const { url, error: uploadError } = await MediaService.uploadAvatar(imageUri, user.id);
      if (uploadError || !url) throw new Error('Upload failed');
      const { error: updateError } = await (useAuthStore.getState().updateProfile({ avatar_url: url }));
      if (updateError) throw new Error('Update failed');
      setProfilePhoto(url);
    } catch {
      setProfilePhoto(user?.avatar_url || null);
      Alert.alert('Error', 'Failed to update photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => onNavigate('AccountSettings')} activeOpacity={0.7}>
          <Ionicons name="settings-outline" size={24} color="#1e293b" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FAC638" />
        }
      >
        {/* Profile Hero */}
        <View style={styles.heroSection}>
          {/* Avatar - centered, large */}
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handleAvatarPress}
            disabled={uploadingPhoto}
            activeOpacity={0.8}
          >
            <View style={styles.avatarRing}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={44} color="#FAC638" />
                </View>
              )}
            </View>
            {uploadingPhoto ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#FAC638" />
              </View>
            ) : (
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Name */}
          <Text style={styles.displayName}>{user?.display_name || 'User'}</Text>
          <Text style={styles.username}>@{user?.username || 'username'}</Text>

          {/* Stats Row - capsule shaped pills */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statPill} onPress={() => onNavigate('MyCapsules')} activeOpacity={0.7}>
              <Ionicons name="time" size={16} color="#FAC638" />
              <Text style={styles.statValue}>{capsulesCount}</Text>
              <Text style={styles.statLabel}>Capsules</Text>
            </TouchableOpacity>

            <View style={styles.statPill}>
              <Ionicons name="people" size={16} color="#FAC638" />
              <Text style={styles.statValue}>{friendsCount}</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </View>

            <View style={styles.statPill}>
              <Ionicons name="flame" size={16} color="#FAC638" />
              <Text style={styles.statValue}>{daysActive}</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
          </View>
        </View>

        {/* Invite Friends Button */}
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => Share.share({ message: "I'm using TimeCapsule to preserve memories! Join me and create your own time capsules \uD83D\uDCE6\u2728" })}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add-outline" size={18} color="#FAC638" />
          <Text style={styles.inviteButtonText}>Invite Friends</Text>
        </TouchableOpacity>

        {/* Memories Button */}
        <TouchableOpacity
          style={styles.memoriesButton}
          onPress={() => onNavigate('Memories')}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={20} color="#FAC638" />
          <Text style={styles.memoriesButtonText}>Memories - On This Day</Text>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </TouchableOpacity>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Capsules</Text>
          {capsulesList.length > 0 && (
            <TouchableOpacity onPress={() => onNavigate('MyCapsules')}>
              <Text style={styles.sectionAction}>See All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Capsules - 2 column card layout */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#FAC638" />
          </View>
        ) : capsulesList.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons name="time-outline" size={40} color="#FAC638" />
            </View>
            <Text style={styles.emptyTitle}>No Capsules Yet</Text>
            <Text style={styles.emptyText}>Create your first time capsule to preserve a memory</Text>
            <TouchableOpacity style={styles.createButton} onPress={() => onNavigate('Create')} activeOpacity={0.8}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Capsule</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsGrid}>
            {capsulesList.map((capsule, index) => {
              const mediaUrl = getMediaUrl(capsule);
              const isLocked = capsule.open_at && new Date(capsule.open_at).getTime() > Date.now();

              return (
                <TouchableOpacity
                  key={capsule.id || index}
                  style={styles.card}
                  onPress={() => setSelectedCapsule(capsule)}
                  activeOpacity={0.85}
                >
                  {/* Card Image */}
                  <View style={styles.cardImageContainer}>
                    {mediaUrl ? (
                      <Image source={{ uri: mediaUrl }} style={styles.cardImage} resizeMode="cover" />
                    ) : (
                      <LinearGradient
                        colors={['#FAC638', '#F59E0B']}
                        style={styles.cardImagePlaceholder}
                      >
                        <Ionicons name="time" size={28} color="#fff" />
                      </LinearGradient>
                    )}
                    {isLocked && (
                      <View style={styles.cardLockBadge}>
                        <Ionicons name="lock-closed" size={12} color="#fff" />
                      </View>
                    )}
                    {capsule.is_public && (
                      <View style={styles.cardPublicBadge}>
                        <Ionicons name="globe-outline" size={10} color="#fff" />
                      </View>
                    )}
                  </View>

                  {/* Card Info */}
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{capsule.title}</Text>
                    <Text style={styles.cardTime}>{timeAgo(capsule.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Photo Picker Modal */}
      <Modal visible={photoPickerVisible} transparent animationType="slide" onRequestClose={() => setPhotoPickerVisible(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPhotoPickerVisible(false)}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Profile Photo</Text>
            <TouchableOpacity style={styles.pickerOption} onPress={handleTakePhoto}>
              <View style={[styles.pickerIcon, { backgroundColor: '#FAC63820' }]}>
                <Ionicons name="camera" size={22} color="#FAC638" />
              </View>
              <Text style={styles.pickerOptionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickerOption} onPress={handleChooseFromGallery}>
              <View style={[styles.pickerIcon, { backgroundColor: '#06D6A020' }]}>
                <Ionicons name="images" size={22} color="#06D6A0" />
              </View>
              <Text style={styles.pickerOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickerCancel} onPress={() => setPhotoPickerVisible(false)}>
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Capsule Detail */}
      <CapsuleDetailModal
        visible={!!selectedCapsule}
        capsule={selectedCapsule}
        capsules={capsulesList}
        onClose={() => setSelectedCapsule(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf8',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 58,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fafaf8',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },

  // Avatar
  avatarWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FAC638',
    padding: 3,
    backgroundColor: '#fff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
    backgroundColor: '#f1f5f9',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FAC638',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fafaf8',
  },

  // Name
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  username: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 18,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },

  // Invite Friends
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#FAC638',
    backgroundColor: 'transparent',
  },
  inviteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAC638',
  },

  // Section
  memoriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFF8E1',
    padding: 14,
    borderRadius: 14,
  },
  memoriesButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAC638',
  },

  // Cards Grid
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f1f5f9',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPublicBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(6,214,160,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 3,
  },
  cardTime: {
    fontSize: 12,
    color: '#94a3b8',
  },

  // Loading
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  // Empty
  emptyBox: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAC638',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Photo Picker
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  pickerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 20,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  pickerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  pickerCancel: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
  },
  pickerCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
});

export default ProfileScreen;
