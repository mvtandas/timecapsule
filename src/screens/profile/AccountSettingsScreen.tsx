import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { AuthService } from '../../lib/auth';

interface AccountSettingsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

const AccountSettingsScreen = ({ onNavigate }: AccountSettingsScreenProps) => {
  const { user, updateProfile } = useAuthStore();
  
  // User info edit state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [editPhoneNumber, setEditPhoneNumber] = useState(user?.phone_number || '');
  const [savingInfo, setSavingInfo] = useState(false);

  useEffect(() => {
    // Update edit fields when user data changes
    if (user) {
      setEditEmail(user.email || '');
      setEditUsername(user.username || '');
      setEditPhoneNumber(user.phone_number || '');
    }
  }, [user]);

  const handleEditInfo = () => {
    setIsEditingInfo(true);
  };

  const handleCancelEditInfo = () => {
    // Reset to original values
    setEditEmail(user?.email || '');
    setEditUsername(user?.username || '');
    setEditPhoneNumber(user?.phone_number || '');
    setIsEditingInfo(false);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUsername = (username: string): boolean => {
    // Username: 3-20 characters, alphanumeric and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Allow empty or valid phone format (at least 10 digits)
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

      const emailChanged = editEmail !== user?.email;
      const usernameChanged = editUsername !== user?.username;
      const phoneChanged = editPhoneNumber !== user?.phone_number;

      // Update email separately via auth if changed
      if (emailChanged) {
        const { error: emailError } = await AuthService.updateEmail(editEmail);
        if (emailError) {
          throw new Error(emailError.message || 'Failed to update email');
        }
      }

      // Update username and phone via profiles if changed
      if (usernameChanged || phoneChanged) {
        const profileUpdates: any = {};
        
        if (usernameChanged) {
          profileUpdates.username = editUsername;
        }
        
        if (phoneChanged) {
          profileUpdates.phone_number = editPhoneNumber;
        }

        const { error: profileError } = await updateProfile(profileUpdates);
        
        if (profileError) {
          const errorMsg = profileError.message || '';
          // Provide specific error messages
          if (errorMsg.toLowerCase().includes('username') && errorMsg.toLowerCase().includes('already')) {
            throw new Error('Username is already taken. Please choose a different one.');
          }
          throw new Error(errorMsg || 'Failed to update profile');
        }
      }

      // Refresh user data to reflect changes
      const { user: updatedUser } = await AuthService.getCurrentUser();
      if (updatedUser) {
        // The auth store will automatically update via the listener
        // but we can manually update if needed
      }

      Alert.alert('Success', 'Account information updated successfully!');
      setIsEditingInfo(false);
    } catch (error: any) {
      console.error('Error updating account info:', error);
      Alert.alert(
        'Update Failed', 
        error.message || 'Failed to update account information. Please try again.'
      );
    } finally {
      setSavingInfo(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onNavigate('Profile')}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        {/* Account Information Section */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Text style={styles.infoCardTitle}>Account Information</Text>
            {!isEditingInfo && (
              <TouchableOpacity 
                style={styles.editIconButton}
                onPress={handleEditInfo}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil" size={20} color="#FAC638" />
              </TouchableOpacity>
            )}
          </View>

          {!isEditingInfo ? (
            // Display Mode
            <View style={styles.infoDisplayContainer}>
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="mail-outline" size={20} color="#64748b" />
                  <Text style={styles.infoLabel}>Email</Text>
                </View>
                <Text style={styles.infoValue}>{user?.email || 'Not set'}</Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="at-outline" size={20} color="#64748b" />
                  <Text style={styles.infoLabel}>Username</Text>
                </View>
                <Text style={styles.infoValue}>{user?.username || 'Not set'}</Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="call-outline" size={20} color="#64748b" />
                  <Text style={styles.infoLabel}>Phone Number</Text>
                </View>
                <Text style={styles.infoValue}>{user?.phone_number || 'Not set'}</Text>
              </View>
            </View>
          ) : (
            // Edit Mode
            <View style={styles.infoEditContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="Enter your email"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="at-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={editUsername}
                    onChangeText={setEditUsername}
                    placeholder="Enter your username"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <Text style={styles.inputHint}>3-20 characters, letters, numbers, and underscores only</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={editPhoneNumber}
                    onChangeText={setEditPhoneNumber}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                  />
                </View>
                <Text style={styles.inputHint}>Optional</Text>
              </View>

              <View style={styles.editButtonsContainer}>
                <TouchableOpacity
                  style={[styles.editButton, styles.cancelButton]}
                  onPress={handleCancelEditInfo}
                  activeOpacity={0.7}
                  disabled={savingInfo}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.editButton, styles.saveButton]}
                  onPress={handleSaveInfo}
                  activeOpacity={0.7}
                  disabled={savingInfo}
                >
                  {savingInfo ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Additional Settings Sections */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <Text style={styles.sectionDescription}>
            Additional account preferences and settings will be available here.
          </Text>
        </View>

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
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  infoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  editIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoDisplayContainer: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'column',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    gap: 8,
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  infoValue: {
    fontSize: 16,
    color: '#1e293b',
    paddingLeft: 28,
  },
  infoEditContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  inputHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  saveButton: {
    backgroundColor: '#FAC638',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});

export default AccountSettingsScreen;

