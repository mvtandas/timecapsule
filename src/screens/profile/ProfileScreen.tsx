import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, TextInput, Modal, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { CapsuleService } from '../../services/capsuleService';
import { MediaService } from '../../lib/media';
import { Friend } from '../../types';

const { height } = Dimensions.get('window');

type Screen = 'Dashboard' | 'MyCapsules' | 'Create' | 'Explore' | 'Profile' | 'FriendProfile' | 'AccountSettings';

interface ProfileScreenProps {
  onNavigate: (screen: Screen, data?: any) => void;
  onLogout: () => void;
}

const ProfileScreen = ({ onNavigate, onLogout }: ProfileScreenProps) => {
  const { user, updateProfile } = useAuthStore();
  const [stats, setStats] = useState([
    { id: 'created', label: 'Capsules Created', value: '0', icon: 'archive', tappable: true },
    { id: 'memories', label: 'Memories Saved', value: '0', icon: 'images', tappable: false },
    { id: 'days', label: 'Days Active', value: '0', icon: 'calendar', tappable: false },
  ]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.display_name || '');
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(user?.avatar_url || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Friends state
  const [newUsername, setNewUsername] = useState('');
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
      const { data, error } = await CapsuleService.getUserCapsules();
      
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

  const handleAddFriend = () => {
    if (!newUsername.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    const username = newUsername.trim().toLowerCase();
    
    // Check if already a friend
    if (friends.find(f => f.username === username)) {
      Alert.alert('Already Friends', 'This user is already in your friends list');
      setNewUsername('');
      return;
    }

    // Mock add friend (in real app, would call API)
    const newFriend: Friend = {
      id: Date.now().toString(),
      name: username.charAt(0).toUpperCase() + username.slice(1),
      username: username,
      friends_since: new Date().getFullYear().toString(),
    };

    setFriends([...friends, newFriend]);
    setNewUsername('');
    Alert.alert('Success', `Added @${username} to your friends!`);
  };

  const handleFriendPress = (friend: Friend) => {
    onNavigate('FriendProfile', { friend });
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
          
          {/* User Info Display */}
          <View style={styles.userInfoContainer}>
            <View style={styles.userInfoRow}>
              <Text style={styles.userInfoLabel}>Email</Text>
              <Text style={styles.userInfoValue}>{user?.email || 'Not set'}</Text>
            </View>
            
            <View style={styles.userInfoRow}>
              <Text style={styles.userInfoLabel}>Username</Text>
              <Text style={styles.userInfoValue}>{user?.username || 'Not set'}</Text>
            </View>
            
            <View style={styles.userInfoRow}>
              <Text style={styles.userInfoLabel}>Phone</Text>
              <Text style={styles.userInfoValue}>{user?.phone_number || 'Not set'}</Text>
            </View>
          </View>
        </View>

        {/* My Friends Section */}
        <View style={styles.friendsCard}>
          <Text style={styles.friendsTitle}>My Friends</Text>
          
          {/* Add Friend Input */}
          <View style={styles.addFriendContainer}>
            <View style={styles.usernameInputContainer}>
              <Ionicons name="at-outline" size={20} color="#94a3b8" style={styles.usernameIcon} />
              <TextInput
                style={styles.usernameInput}
                value={newUsername}
                onChangeText={setNewUsername}
                placeholder="Enter username to add friend"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleAddFriend}
              />
            </View>
            <TouchableOpacity
              style={styles.addFriendButton}
              onPress={handleAddFriend}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={24} color="#FAC638" />
            </TouchableOpacity>
          </View>

          {/* Friends List */}
          {friends.length > 0 ? (
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
          ) : (
            <View style={styles.emptyFriendsState}>
              <Ionicons name="people-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyFriendsText}>
                No friends yet. Add friends by entering their username above.
              </Text>
            </View>
          )}
        </View>

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
    marginBottom: 16,
  },
  userInfoContainer: {
    width: '100%',
    gap: 10,
  },
  userInfoRow: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  userInfoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userInfoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  // Friends Section
  friendsCard: {
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
  friendsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  addFriendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  usernameInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  usernameIcon: {
    marginRight: 12,
  },
  usernameInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  addFriendButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAC63820',
    borderRadius: 12,
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
  emptyFriendsState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyFriendsText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
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
    height: 20,
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
