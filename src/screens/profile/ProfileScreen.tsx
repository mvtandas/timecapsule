import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, TextInput, Modal, Image, Dimensions, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { CapsuleService } from '../../services/capsuleService';
import { MediaService } from '../../services/mediaService';
import { COLORS, GRADIENTS, SHADOWS } from '../../constants/colors';

const { height } = Dimensions.get('window');

interface ProfileScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onLogout: () => void;
  onGoBack?: () => void;
}

const ProfileScreen = ({ onNavigate, onLogout }: ProfileScreenProps) => {
  const { user, updateProfile } = useAuthStore();
  const [capsulesCreated, setCapsulesCreated] = useState(0);
  const [capsulesReceived, setCapsulesReceived] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.display_name || '');
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(user?.avatar_url || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const INVITE_MODAL_HEIGHT = height * 0.9;
  const inviteModalTranslateY = useRef(new Animated.Value(INVITE_MODAL_HEIGHT)).current;
  const inviteModalBackdropOpacity = useRef(new Animated.Value(0)).current;

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

        // Set capsules counts
        setCapsulesCreated(capsulesCount);
        setCapsulesReceived(!sharedError && sharedData ? sharedData.length : 0);
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
    { id: 'account', label: 'Account Settings', icon: 'person-outline', color: COLORS.gradient.pink },
    { id: 'notifications', label: 'Notifications', icon: 'notifications-outline', color: COLORS.gradient.purple },
    { id: 'privacy', label: 'Privacy & Security', icon: 'lock-closed-outline', color: COLORS.gradient.blue },
    { id: 'help', label: 'Help & Support', icon: 'help-circle-outline', color: COLORS.gradient.pink },
    { id: 'about', label: 'About', icon: 'information-circle-outline', color: COLORS.gradient.purple },
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

  // Invite modal functions
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
        duration: 200,
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

  const handleSendInvite = () => {
    if (!inviteIdentifier.trim()) {
      Alert.alert('Missing Information', 'Please enter a username or email address');
      return;
    }

    // Placeholder logic - will be replaced with actual API call
    Alert.alert(
      'Invitation Sent!',
      `Invitation sent to ${inviteIdentifier}. They will receive 5 Premium Capsules when they join!`,
      [
        {
          text: 'OK',
          onPress: closeInviteModal,
        },
      ]
    );
  };

  // Pan responder for invite modal drag to dismiss
  const inviteModalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          inviteModalTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          closeInviteModal();
        } else {
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onNavigate('Dashboard')}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
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
        showsVerticalScrollIndicator={false}
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
                <ActivityIndicator size="large" color={COLORS.gradient.pink} />
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
              <Text style={styles.userInfoText} numberOfLines={1}>
                <Text style={styles.infoValue}>@{user?.username || 'Not set'}</Text>
              </Text>
            </View>
            <View style={styles.chevronContainer}>
              <Ionicons name="chevron-forward" size={16} color={COLORS.text.tertiary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Invite Friends Button */}
        <TouchableOpacity 
          style={styles.inviteFriendsButton}
          onPress={openInviteModal}
          activeOpacity={0.8}
        >
          <View style={styles.inviteFriendsIcon}>
            <Ionicons name="person-add" size={22} color="white" />
          </View>
          <Text style={styles.inviteFriendsText}>Invite Friends</Text>
          <Ionicons name="chevron-forward" size={20} color="white" />
        </TouchableOpacity>

        {/* My Capsules Preview */}
        <TouchableOpacity 
          style={styles.capsulesPreviewCard}
          onPress={() => onNavigate('MyCapsules')}
          activeOpacity={0.7}
        >
          <View style={styles.capsulesPreviewHeader}>
            <Text style={styles.capsulesPreviewTitle}>My Capsules</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
          </View>
          
          <View style={styles.capsulesPreviewContent}>
            <View style={styles.capsulePreviewItem}>
              <View style={styles.capsulePreviewIconContainer}>
                <Ionicons name="create-outline" size={28} color={COLORS.gradient.pink} />
              </View>
              <Text style={styles.capsulePreviewValue}>{capsulesCreated}</Text>
              <Text style={styles.capsulePreviewLabel}>Created</Text>
            </View>
            
            <View style={styles.capsulePreviewDivider} />
            
            <View style={styles.capsulePreviewItem}>
              <View style={styles.capsulePreviewIconContainer}>
                <Ionicons name="gift-outline" size={28} color={COLORS.gradient.purple} />
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
              <Ionicons name="chevron-forward" size={24} color={COLORS.text.tertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.gradient.purple} />
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
                <Ionicons name="camera" size={24} color={COLORS.gradient.pink} />
              </View>
              <Text style={styles.photoPickerOptionText}>Take Photo</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoPickerOption}
              onPress={handleChooseFromGallery}
              activeOpacity={0.7}
            >
              <View style={styles.photoPickerIcon}>
                <Ionicons name="images" size={24} color={COLORS.status.success} />
              </View>
              <Text style={styles.photoPickerOptionText}>Choose from Gallery</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
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

      {/* Invite Friends Modal */}
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
              <Ionicons name="close" size={18} color={COLORS.text.secondary} />
            </TouchableOpacity>

            {/* Scrollable Content */}
            <ScrollView
              style={styles.inviteModalContent}
              contentContainerStyle={styles.inviteModalContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Image/Banner Area */}
              <View style={styles.inviteModalImagePlaceholder}>
                <Ionicons name="gift" size={64} color={COLORS.gradient.pink} />
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
                  <Ionicons name="person-add-outline" size={20} color={COLORS.text.tertiary} style={styles.inviteModalInputIcon} />
                  <TextInput
                    style={styles.inviteModalInput}
                    placeholder="Enter friend's username or email"
                    placeholderTextColor={COLORS.text.tertiary}
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
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.status.success} />
                    </View>
                    <Text style={styles.inviteModalBenefitText}>
                      Get 5 Premium Capsules instantly
                    </Text>
                  </View>
                  <View style={styles.inviteModalBenefitItem}>
                    <View style={styles.inviteModalBenefitIcon}>
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.status.success} />
                    </View>
                    <Text style={styles.inviteModalBenefitText}>
                      Help your friend save memories
                    </Text>
                  </View>
                  <View style={styles.inviteModalBenefitItem}>
                    <View style={styles.inviteModalBenefitIcon}>
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.status.success} />
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
    backgroundColor: COLORS.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: COLORS.background.primary,
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
    color: COLORS.gradient.pink,
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
    backgroundColor: COLORS.background.secondary,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOWS.soft,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.gradient.pink,
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
    backgroundColor: COLORS.gradient.pink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.background.primary,
    ...SHADOWS.pink,
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
    color: COLORS.text.primary,
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
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.primary,
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
    color: COLORS.text.tertiary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
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
    backgroundColor: COLORS.background.secondary,
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
    color: COLORS.text.primary,
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
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  capsulePreviewValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  capsulePreviewLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.secondary,
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
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
  menuContainer: {
    backgroundColor: COLORS.background.secondary,
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
    color: COLORS.text.primary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.secondary,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.gradient.purple,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gradient.purple,
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
    backgroundColor: COLORS.background.secondary,
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
    color: COLORS.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  photoPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
    marginBottom: 12,
  },
  photoPickerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  photoPickerOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  photoPickerCancel: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  photoPickerCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.tertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 20,
  },
  modalInputContainer: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: COLORS.background.primary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text.primary,
    borderWidth: 2,
    borderColor: COLORS.border.primary,
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
    backgroundColor: COLORS.background.tertiary,
  },
  modalButtonSave: {
    backgroundColor: COLORS.gradient.pink,
    ...SHADOWS.pink,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.secondary,
  },
  // Invite Friends Button
  inviteFriendsButton: {
    backgroundColor: COLORS.gradient.purple,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    ...SHADOWS.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  inviteFriendsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteFriendsText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  // Invite Modal Styles
  inviteModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  inviteModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  inviteModalSheet: {
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  inviteModalDragHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  inviteModalDragBar: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
  },
  inviteModalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  inviteModalContent: {
    flex: 1,
  },
  inviteModalContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  inviteModalImagePlaceholder: {
    height: 200,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  inviteModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text.primary,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 12,
  },
  inviteModalSubtext: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  inviteModalForm: {
    gap: 16,
  },
  inviteModalFormLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  inviteModalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border.primary,
  },
  inviteModalInputIcon: {
    marginRight: 12,
  },
  inviteModalInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  inviteModalInputHint: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginTop: -8,
  },
  inviteModalBenefits: {
    gap: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  inviteModalBenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inviteModalBenefitIcon: {
    width: 32,
    height: 32,
  },
  inviteModalBenefitText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  inviteModalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gradient.pink,
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 32,
    gap: 8,
    ...SHADOWS.pink,
  },
  inviteModalActionButtonIcon: {
    marginRight: 4,
  },
  inviteModalActionButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
});

export default ProfileScreen;
