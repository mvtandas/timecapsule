import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { CapsuleService } from '../../services/capsuleService';

type Screen = 'Dashboard' | 'Create' | 'Explore' | 'Profile';

interface ProfileScreenProps {
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}

const ProfileScreen = ({ onNavigate, onLogout }: ProfileScreenProps) => {
  const { user, updateProfile } = useAuthStore();
  const [stats, setStats] = useState([
    { label: 'Capsules Created', value: '0', icon: 'archive' },
    { label: 'Memories Saved', value: '0', icon: 'images' },
    { label: 'Days Active', value: '0', icon: 'calendar' },
  ]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.display_name || '');

  useEffect(() => {
    loadStats();
  }, []);

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
          { label: 'Capsules Created', value: capsulesCount.toString(), icon: 'archive' },
          { label: 'Memories Saved', value: memoriesCount.toString(), icon: 'images' },
          { label: 'Days Active', value: daysActive.toString(), icon: 'calendar' },
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
      handleEditProfile();
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

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: onLogout, style: 'destructive' },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Profile Info */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color="white" />
          </View>
          <Text style={styles.userName}>{user?.display_name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <Ionicons name={stat.icon as any} size={24} color="#FAC638" />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
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

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => onNavigate('Dashboard')} style={styles.navItem}>
          <Ionicons name="file-tray-full-outline" size={24} color="#94a3b8" />
          <Text style={styles.navText}>Capsules</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onNavigate('Create')} style={styles.navItem}>
          <Ionicons name="add-circle-outline" size={24} color="#94a3b8" />
          <Text style={styles.navText}>Create</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onNavigate('Explore')} style={styles.navItem}>
          <Ionicons name="map-outline" size={24} color="#94a3b8" />
          <Text style={styles.navText}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onNavigate('Profile')} style={styles.navItem}>
          <Ionicons name="person" size={24} color="#FAC638" />
          <Text style={[styles.navText, styles.navTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
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
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FAC638',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#94a3b8',
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
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: 8,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8f8f5',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
  },
  navTextActive: {
    fontWeight: '700',
    color: '#FAC638',
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
