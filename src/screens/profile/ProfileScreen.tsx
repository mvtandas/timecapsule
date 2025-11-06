import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, TextInput, Modal, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { CapsuleService } from '../../services/capsuleService';
import { MediaService } from '../../lib/media';

const { height } = Dimensions.get('window');

interface ProfileScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onLogout: () => void;
  onGoBack?: () => void;
}

const ProfileScreen = ({ onNavigate, onLogout }: ProfileScreenProps) => {
  const { user, updateProfile } = useAuthStore();
  const [stats, setStats] = useState([
    { id: 'created', label: 'Capsules Created', value: '0', icon: 'archive', tappable: true },
    { id: 'memories', label: 'Memories Saved', value: '0', icon: 'images', tappable: false },
    { id: 'days', label: 'Days Active', value: '0', icon: 'calendar', tappable: false },
  ]);
  const [capsulesCreated, setCapsulesCreated] = useState(0);
  const [capsulesReceived, setCapsulesReceived] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.display_name || '');
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(user?.avatar_url || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    // Update profile photo when user data changes
    if (user?.avatar_url) {
      setProfilePhoto(user.avatar_url);
    }
  }, [user?.avatar_url]);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Fetch created capsules
      const { data, error } = await CapsuleService.getUserCapsules();
      
      // Fetch received/shared capsules
      const { data: sharedData, error: sharedError } = await CapsuleService.getSharedCapsules();
      
      if (!error && data) {
        const capsulesCount = data.length;
        const memoriesCount = data.reduce((acc, capsule) => {
          return acc + (capsule.content_refs?.length || 0);
        }, 0);
        
        // Calculate days active (from oldest capsule)
        let daysActive = 0;
        if (data.length > 0) {
          const oldestDate = new Date(data[data.length - 1].created_at);
          const now = new Date();
          daysActive = Math.floor((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Set capsules counts
        setCapsulesCreated(capsulesCount);
        setCapsulesReceived(!sharedError && sharedData ? sharedData.length : 0);

        setStats([
          { id: 'created', label: 'Capsules Created', value: capsulesCount.toString(), icon: 'archive', tappable: true },
          { id: 'memories', label: 'Memories Saved', value: memoriesCount.toString(), icon: 'images', tappable: false },
          { id: 'days', label: 'Days Active', value: daysActive.toString(), icon: 'calendar', tappable: false },
        ]);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setEditName(user?.display_name || '');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      const { error } = await updateProfile({ display_name: editName });
      
      if (error) {
        Alert.alert('Error', 'Failed to update profile');
      } else {
        Alert.alert('Success', 'Profile updated successfully!');
        setEditModalVisible(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    }
  };

  const menuItems = [
    { id: 'account', label: 'Account Settings', icon: 'person-outline', color: '#FAC638' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications-outline', color: '#06D6A0' },
    { id: 'privacy', label: 'Privacy & Security', icon: 'lock-closed-outline', color: '#FF6B6B' },
    { id: 'help', label: 'Help & Support', icon: 'help-circle-outline', color: '#FFD166' },
    { id: 'about', label: 'About', icon: 'information-circle-outline', color: '#94a3b8' },
  ];

  const handleMenuPress = (id: string) => {
    if (id === 'account') {
      onNavigate('AccountSettings');
    } else if (id === 'notifications') {
      Alert.alert('Notifications', 'This feature will be available soon!');
    } else if (id === 'privacy') {
      Alert.alert('Privacy & Security', 'This feature will be available soon!');
    } else if (id === 'help') {
      Alert.alert('Help & Support', 'Need help? Email us at support@timecapsule.app');
    } else if (id === 'about') {
      Alert.alert('About Time Capsule', 'Version 1.0.0\n\nCapture moments, share memories.');
    }
  };

  const handleStatPress = (statId: string) => {
    if (statId === 'created') {
      onNavigate('MyCapsules');
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: onLogout, style: 'destructive' },
    ]);
  };

  const handleAvatarPress = () => {
    setPhotoPickerVisible(true);
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setPhotoPickerVisible(false);
        await uploadAndUpdateAvatar(imageUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleChooseFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Gallery permission is needed to select photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setPhotoPickerVisible(false);
        await uploadAndUpdateAvatar(imageUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const uploadAndUpdateAvatar = async (imageUri: string) => {
    if (!user?.id) {
      Alert.alert('Hata', 'Kullanıcı bulunamadı');
      return;
    }

    try {
      setUploadingPhoto(true);
      
      // Show optimistic update
      setProfilePhoto(imageUri);

      // Upload image to Supabase Storage
      const { url, error: uploadError } = await MediaService.uploadAvatar(imageUri, user.id);

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message || 'Unknown error'}`);
      }

      if (!url) {
        throw new Error('No URL returned from upload');
      }

      // Update user profile with new avatar URL
      const { error: updateError } = await updateProfile({ avatar_url: url });

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error(`Profile update failed: ${updateError.message || 'Unknown error'}`);
      }

      // Update local state with the permanent URL
      setProfilePhoto(url);
      Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      const errorMessage = error?.message || 'Bilinmeyen hata';
      Alert.alert(
        'Hata', 
        `Profil fotoğrafı yüklenemedi.\n\n${errorMessage}\n\nLütfen tekrar deneyin veya internet bağlantınızı kontrol edin.`
      );
      // Revert to previous photo
      setProfilePhoto(user?.avatar_url || null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onNavigate('Dashboard')}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        scrollEventThrottle={16}
        decelerationRate="normal"
        bounces={true}
        overScrollMode="auto"
        showsVerticalScrollIndicator={true}
      >
        {/* Profile Info */}
        <View style={styles.profileCard}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handleAvatarPress}
            activeOpacity={0.7}
            disabled={uploadingPhoto}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={48} color="white" />
              </View>
            )}
            {uploadingPhoto ? (
              <View style={styles.avatarUploadingOverlay}>
                <ActivityIndicator size="large" color="#FAC638" />
              </View>
            ) : (
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={16} color="white" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.display_name || 'User'}</Text>
          
          {/* User Info Row - Centered & Tappable */}
          <TouchableOpacity 
            style={styles.userInfoRow}
            onPress={() => onNavigate('AccountSettings')}
            activeOpacity={0.7}
          >
            <View style={styles.userInfoWrapper}>
              <Text style={styles.userInfoText} numberOfLines={2}>
                <Text style={styles.infoLabel}>Email: </Text>
                <Text style={styles.infoValue}>{user?.email || 'Not set'}</Text>
                <Text style={styles.infoDivider}> • </Text>
                <Text style={styles.infoLabel}>Username: </Text>
                <Text style={styles.infoValue}>{user?.username || 'Not set'}</Text>
                <Text style={styles.infoDivider}> • </Text>
                <Text style={styles.infoLabel}>Phone: </Text>
                <Text style={styles.infoValue}>{user?.phone_number || 'Not set'}</Text>
              </Text>
            </View>
            <View style={styles.chevronContainer}>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* My Capsules Preview */}
        <TouchableOpacity 
          style={styles.capsulesPreviewCard}
          onPress={() => onNavigate('MyCapsules')}
          activeOpacity={0.7}
        >
          <View style={styles.capsulesPreviewHeader}>
            <Text style={styles.capsulesPreviewTitle}>My Capsules</Text>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </View>
          
          <View style={styles.capsulesPreviewContent}>
            <View style={styles.capsulePreviewItem}>
              <View style={styles.capsulePreviewIconContainer}>
                <Ionicons name="create-outline" size={28} color="#FAC638" />
              </View>
              <Text style={styles.capsulePreviewValue}>{capsulesCreated}</Text>
              <Text style={styles.capsulePreviewLabel}>Created</Text>
            </View>
            
            <View style={styles.capsulePreviewDivider} />
            
            <View style={styles.capsulePreviewItem}>
              <View style={styles.capsulePreviewIconContainer}>
                <Ionicons name="gift-outline" size={28} color="#10b981" />
              </View>
              <Text style={styles.capsulePreviewValue}>{capsulesReceived}</Text>
              <Text style={styles.capsulePreviewLabel}>Received</Text>
            </View>
          </View>
          
          {capsulesCreated === 0 && capsulesReceived === 0 && (
            <View style={styles.capsulesEmptyState}>
              <Text style={styles.capsulesEmptyText}>No capsules yet</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Stats */}
        <View style={styles.statsContainer}>
          {stats.map((stat) => {
            const StatContainer = stat.tappable ? TouchableOpacity : View;
            return (
              <StatContainer
                key={stat.label}
                style={styles.statItem}
                onPress={stat.tappable ? () => handleStatPress(stat.id) : undefined}
                activeOpacity={stat.tappable ? 0.7 : 1}
              >
                <Ionicons name={stat.icon as any} size={24} color="#FAC638" />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
                {stat.tappable && (
                  <View style={styles.statTapIndicator}>
                    <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
                  </View>
                )}
              </StatContainer>
            );
          })}
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleMenuPress(item.id)}
              style={styles.menuItem}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Photo Picker Modal */}
      <Modal
        visible={photoPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPhotoPickerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.photoPickerOverlay}
          activeOpacity={1}
          onPress={() => setPhotoPickerVisible(false)}
        >
          <View style={styles.photoPickerSheet}>
            <View style={styles.photoPickerHandle} />
            
            <Text style={styles.photoPickerTitle}>Update Profile Photo</Text>
            
            <TouchableOpacity
              style={styles.photoPickerOption}
              onPress={handleTakePhoto}
              activeOpacity={0.7}
            >
              <View style={styles.photoPickerIcon}>
                <Ionicons name="camera" size={24} color="#FAC638" />
              </View>
              <Text style={styles.photoPickerOptionText}>Take Photo</Text>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoPickerOption}
              onPress={handleChooseFromGallery}
              activeOpacity={0.7}
            >
              <View style={styles.photoPickerIcon}>
                <Ionicons name="images" size={24} color="#06D6A0" />
              </View>
              <Text style={styles.photoPickerOptionText}>Choose from Gallery</Text>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoPickerCancel}
              onPress={() => setPhotoPickerVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.photoPickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Display Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                style={styles.modalInput}
                placeholder="Enter your name"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveProfile}
                style={[styles.modalButton, styles.modalButtonSave]}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    width: 32,
    alignItems: 'flex-start',
  },
  headerSpacer: {
    width: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FAC638',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 120, // Extra space for bottom tab bar + logout button
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FAC638',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAC638',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  // User info row (horizontal, centered)
  userInfoRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 50,
    gap: 8,
  },
  userInfoWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  infoDivider: {
    fontSize: 13,
    fontWeight: '400',
    color: '#cbd5e1',
  },
  chevronContainer: {
    paddingLeft: 4,
  },
  // My Capsules Preview Styles
  capsulesPreviewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  capsulesPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  capsulesPreviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  capsulesPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  capsulePreviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  capsulePreviewIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  capsulePreviewValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  capsulePreviewLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  capsulePreviewDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16,
  },
  capsulesEmptyState: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  capsulesEmptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    flex: 1,
    paddingVertical: 4,
  },
  statTapIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  bottomSpacer: {
    height: 100, // Extra space for bottom tab bar
  },
  // Photo Picker Modal
  photoPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  photoPickerSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  photoPickerHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  photoPickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  photoPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
  },
  photoPickerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  photoPickerOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  photoPickerCancel: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  photoPickerCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
  },
  modalInputContainer: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#f8f8f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f1f5f9',
  },
  modalButtonSave: {
    backgroundColor: '#FAC638',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
  },
});

export default ProfileScreen;
