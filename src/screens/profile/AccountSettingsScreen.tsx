import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { AuthService } from '../../lib/auth';

interface AccountSettingsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
  onLogout: () => void;
}

const AccountSettingsScreen = ({ onNavigate, onGoBack, onLogout }: AccountSettingsScreenProps) => {
  const { user, updateProfile } = useAuthStore();

  // Edit fields
  const [editDisplayName, setEditDisplayName] = useState(user?.display_name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [editPhoneNumber, setEditPhoneNumber] = useState(user?.phone_number || '');
  const [savingInfo, setSavingInfo] = useState(false);

  // Password change fields
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState({
    displayName: user?.display_name || '',
    email: user?.email || '',
    username: user?.username || '',
    phoneNumber: user?.phone_number || '',
  });

  useEffect(() => {
    if (user) {
      const vals = {
        displayName: user.display_name || '',
        email: user.email || '',
        username: user.username || '',
        phoneNumber: user.phone_number || '',
      };
      setEditDisplayName(vals.displayName);
      setEditEmail(vals.email);
      setEditUsername(vals.username);
      setEditPhoneNumber(vals.phoneNumber);
      setOriginalValues(vals);
    }
  }, [user]);

  const hasChanges =
    editDisplayName !== originalValues.displayName ||
    editEmail !== originalValues.email ||
    editUsername !== originalValues.username ||
    editPhoneNumber !== originalValues.phoneNumber;

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUsername = (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return true;
    const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
    return phoneRegex.test(phone);
  };

  const handleSaveInfo = async () => {
    // Validate inputs
    if (!validateEmail(editEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (editUsername && !validateUsername(editUsername)) {
      Alert.alert('Invalid Username', 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.');
      return;
    }

    if (editPhoneNumber && !validatePhoneNumber(editPhoneNumber)) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number.');
      return;
    }

    try {
      setSavingInfo(true);

      const emailChanged = editEmail !== originalValues.email;
      const usernameChanged = editUsername !== originalValues.username;
      const phoneChanged = editPhoneNumber !== originalValues.phoneNumber;
      const displayNameChanged = editDisplayName !== originalValues.displayName;

      // Update email separately via auth if changed
      if (emailChanged) {
        const { error: emailError } = await AuthService.updateEmail(editEmail);
        if (emailError) {
          throw new Error((emailError as any).message || 'Failed to update email');
        }
      }

      // Update profile fields if changed
      if (usernameChanged || phoneChanged || displayNameChanged) {
        const profileUpdates: any = {};

        if (usernameChanged) {
          profileUpdates.username = editUsername;
        }

        if (phoneChanged) {
          profileUpdates.phone_number = editPhoneNumber;
        }

        if (displayNameChanged) {
          profileUpdates.display_name = editDisplayName;
        }

        const { error: profileError } = await updateProfile(profileUpdates);

        if (profileError) {
          const errorMsg = profileError.message || '';
          if (errorMsg.toLowerCase().includes('username') && errorMsg.toLowerCase().includes('already')) {
            throw new Error('Username is already taken. Please choose a different one.');
          }
          throw new Error(errorMsg || 'Failed to update profile');
        }
      }

      // Refresh user data
      const { user: updatedUser } = await AuthService.getCurrentUser();
      if (updatedUser) {
        // Auth store will update via listener
      }

      // Update original values to reflect saved state
      setOriginalValues({
        displayName: editDisplayName,
        email: editEmail,
        username: editUsername,
        phoneNumber: editPhoneNumber,
      });

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      if (__DEV__) console.error('Error updating account info:', error);
      Alert.alert(
        'Update Failed',
        error.message || 'Failed to update account information. Please try again.'
      );
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'Please make sure both passwords match.');
      return;
    }

    try {
      setSavingPassword(true);
      const { error } = await AuthService.changePassword(newPassword);

      if (error) {
        throw new Error((error as any).message || 'Failed to change password');
      }

      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
      Alert.alert('Success', 'Your password has been changed successfully.');
    } catch (error: any) {
      if (__DEV__) console.error('Error changing password:', error);
      Alert.alert(
        'Password Change Failed',
        error.message || 'Failed to change password. Please try again.'
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, all your capsules, comments, and data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await AuthService.deleteAccount();
              if (error) {
                Alert.alert('Error', 'Failed to delete account. Please try again.');
              } else {
                onLogout();
              }
            } catch {
              Alert.alert('Error', 'Something went wrong.');
            }
          },
        },
      ]
    );
  };

  const handleLogoutPress = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: onLogout, style: 'destructive' },
    ]);
  };

  const renderMenuItem = (
    icon: string,
    label: string,
    onPress: () => void,
    options?: { destructive?: boolean; isLast?: boolean }
  ) => (
    <TouchableOpacity
      style={[styles.menuItem, options?.isLast && styles.menuItemLast]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.menuItemLeft}>
        <Ionicons
          name={icon as any}
          size={20}
          color={options?.destructive ? '#FF3B30' : '#1e293b'}
        />
        <Text style={[styles.menuItemLabel, options?.destructive && styles.menuItemLabelDestructive]}>
          {label}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#c7c7cc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onGoBack && onGoBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileCardAvatar}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.profileCardAvatarImage} />
            ) : (
              <View style={styles.profileCardAvatarPlaceholder}>
                <Ionicons name="person" size={36} color="white" />
              </View>
            )}
          </View>
          <Text style={styles.profileCardName}>{user?.display_name || 'User'}</Text>
          <Text style={styles.profileCardUsername}>@{user?.username || 'username'}</Text>
        </View>

        {/* Edit Profile Section */}
        <Text style={styles.sectionHeader}>EDIT PROFILE</Text>
        <View style={styles.card}>
          <View style={styles.editField}>
            <Text style={styles.editFieldLabel}>Display Name</Text>
            <TextInput
              style={styles.editFieldInput}
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              placeholder="Enter display name"
              placeholderTextColor="#c7c7cc"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.editFieldSeparator} />

          <View style={styles.editField}>
            <Text style={styles.editFieldLabel}>Username</Text>
            <TextInput
              style={styles.editFieldInput}
              value={editUsername}
              onChangeText={setEditUsername}
              placeholder="Enter username"
              placeholderTextColor="#c7c7cc"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.editFieldSeparator} />

          <View style={styles.editField}>
            <Text style={styles.editFieldLabel}>Email</Text>
            <TextInput
              style={styles.editFieldInput}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="Enter email"
              placeholderTextColor="#c7c7cc"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.editFieldSeparator} />

          <View style={styles.editFieldLast}>
            <Text style={styles.editFieldLabel}>Phone</Text>
            <TextInput
              style={styles.editFieldInput}
              value={editPhoneNumber}
              onChangeText={setEditPhoneNumber}
              placeholder="Enter phone number"
              placeholderTextColor="#c7c7cc"
              keyboardType="phone-pad"
            />
          </View>

          {hasChanges && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveInfo}
              activeOpacity={0.7}
              disabled={savingInfo}
            >
              {savingInfo ? (
                <ActivityIndicator size="small" color="#1e293b" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Change Password Section */}
        <Text style={styles.sectionHeader}>CHANGE PASSWORD</Text>
        <View style={styles.card}>
          {!showPasswordChange ? (
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => setShowPasswordChange(true)}
              activeOpacity={0.6}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="lock-closed-outline" size={20} color="#1e293b" />
                <Text style={styles.menuItemLabel}>Change Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#c7c7cc" />
            </TouchableOpacity>
          ) : (
            <View>
              <View style={styles.editField}>
                <Text style={styles.editFieldLabel}>New Password</Text>
                <TextInput
                  style={styles.editFieldInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor="#c7c7cc"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.editFieldSeparator} />

              <View style={styles.editFieldLast}>
                <Text style={styles.editFieldLabel}>Confirm Password</Text>
                <TextInput
                  style={styles.editFieldInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#c7c7cc"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.passwordActions}>
                <TouchableOpacity
                  style={styles.passwordCancelBtn}
                  onPress={() => {
                    setShowPasswordChange(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.passwordCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, { flex: 1, marginHorizontal: 0, marginLeft: 8 }]}
                  onPress={handleChangePassword}
                  activeOpacity={0.7}
                  disabled={savingPassword}
                >
                  {savingPassword ? (
                    <ActivityIndicator size="small" color="#1e293b" />
                  ) : (
                    <Text style={styles.saveButtonText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Account Group */}
        <Text style={styles.sectionHeader}>ACCOUNT</Text>
        <View style={styles.card}>
          {renderMenuItem('notifications-outline', 'Notifications', () => onNavigate('Notifications'), { isLast: true })}
        </View>

        {/* Support Group */}
        <Text style={styles.sectionHeader}>SUPPORT</Text>
        <View style={styles.card}>
          {renderMenuItem('help-circle-outline', 'Help & Support', () => {
            Alert.alert('Help & Support', 'Need help? Contact us at support@timecapsule.app');
          })}
          {renderMenuItem('information-circle-outline', 'About', () => {
            Alert.alert('About TimeCapsule', 'TimeCapsule v1.0.0\n\nSave your memories for the future.');
          }, { isLast: true })}
        </View>

        {/* Actions Group */}
        <Text style={styles.sectionHeader}>ACTIONS</Text>
        <View style={styles.card}>
          {renderMenuItem('log-out-outline', 'Logout', handleLogoutPress, { destructive: true })}
          {renderMenuItem('trash-outline', 'Delete Account', handleDeleteAccount, { destructive: true, isLast: true })}
        </View>

        {/* Version */}
        <Text style={styles.versionText}>TimeCapsule v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#f2f2f7',
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
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  // Profile Card
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileCardAvatar: {
    marginBottom: 12,
  },
  profileCardAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileCardAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FAC638',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCardName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  profileCardUsername: {
    fontSize: 15,
    color: '#8e8e93',
  },
  // Section Header
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  // Edit Fields
  editField: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  editFieldLast: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  editFieldSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#c6c6c8',
    marginLeft: 16,
  },
  editFieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8e8e93',
    marginBottom: 4,
  },
  editFieldInput: {
    fontSize: 16,
    color: '#1e293b',
    paddingVertical: 4,
  },
  // Save Button
  saveButton: {
    backgroundColor: '#FAC638',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#c6c6c8',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 16,
    color: '#1e293b',
  },
  menuItemLabelDestructive: {
    color: '#FF3B30',
  },
  // Password Actions
  passwordActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  passwordCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f2f2f7',
    borderWidth: 1,
    borderColor: '#c6c6c8',
  },
  passwordCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8e8e93',
  },
  // Version
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 8,
    marginBottom: 20,
  },
});

export default AccountSettingsScreen;
