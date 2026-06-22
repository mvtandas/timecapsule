import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, TextInput, Image, Switch, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { AuthService } from '../../lib/auth';
import { COLORS, font } from '../../constants/theme';
import ScreenHeader from '../../components/common/ScreenHeader';
import { useT, useLanguage, LANGUAGES } from '../../i18n';
import { PreferencesService, UserPreferences, DEFAULT_PREFERENCES } from '../../services/preferencesService';

const HOME_LAYOUTS: { value: UserPreferences['home_layout']; labelKey: string; defaultValue: string }[] = [
  { value: 'map', labelKey: 'settingsMore.layout_map', defaultValue: 'Map' },
  { value: 'split', labelKey: 'settingsMore.layout_split', defaultValue: 'Split' },
  { value: 'feed', labelKey: 'settingsMore.layout_feed', defaultValue: 'Feed' },
];

interface AccountSettingsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
  onLogout: () => void;
}

const AccountSettingsScreen = ({ onNavigate, onGoBack, onLogout }: AccountSettingsScreenProps) => {
  const t = useT();
  const { locale, setLocale } = useLanguage();
  const { user, updateProfile } = useAuthStore();

  // Edit fields
  const [editDisplayName, setEditDisplayName] = useState(user?.display_name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [editPhoneNumber, setEditPhoneNumber] = useState(user?.phone_number || '');
  const [editLocation, setEditLocation] = useState(user?.location || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [savingInfo, setSavingInfo] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; username?: string; phone?: string }>({});

  // Password change fields
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Notification / privacy / layout preferences
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    let active = true;
    PreferencesService.get().then((p) => {
      if (active) setPrefs(p);
    });
    return () => {
      active = false;
    };
  }, []);

  const updatePref = async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    const previous = prefs[key];
    // Optimistic update
    setPrefs((p) => ({ ...p, [key]: value }));
    const { error } = await PreferencesService.update({ [key]: value } as Partial<UserPreferences>);
    if (error) {
      // Roll back on failure
      setPrefs((p) => ({ ...p, [key]: previous }));
    }
  };

  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState({
    displayName: user?.display_name || '',
    email: user?.email || '',
    username: user?.username || '',
    phoneNumber: user?.phone_number || '',
    location: user?.location || '',
    bio: user?.bio || '',
  });

  useEffect(() => {
    if (user) {
      const vals = {
        displayName: user.display_name || '',
        email: user.email || '',
        username: user.username || '',
        phoneNumber: user.phone_number || '',
        location: user.location || '',
        bio: user.bio || '',
      };
      setEditDisplayName(vals.displayName);
      setEditEmail(vals.email);
      setEditUsername(vals.username);
      setEditPhoneNumber(vals.phoneNumber);
      setEditLocation(vals.location);
      setEditBio(vals.bio);
      setOriginalValues(vals);
    }
  }, [user]);

  const hasChanges =
    editDisplayName !== originalValues.displayName ||
    editEmail !== originalValues.email ||
    editUsername.toLowerCase() !== originalValues.username.toLowerCase() ||
    editPhoneNumber !== originalValues.phoneNumber ||
    editLocation !== originalValues.location ||
    editBio !== originalValues.bio;

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
    // Inline field validation
    const fe: { email?: string; username?: string; phone?: string } = {};
    if (!validateEmail(editEmail)) fe.email = t('auth.invalid_email');
    if (editUsername && !validateUsername(editUsername)) fe.username = t('settingsMore.alert_invalid_username_msg');
    if (editPhoneNumber && !validatePhoneNumber(editPhoneNumber)) fe.phone = t('settingsMore.alert_invalid_phone_msg');
    if (Object.keys(fe).length) { setErrors(fe); return; }
    setErrors({});

    try {
      setSavingInfo(true);

      const emailChanged = editEmail !== originalValues.email;
      const usernameChanged = editUsername !== originalValues.username;
      const phoneChanged = editPhoneNumber !== originalValues.phoneNumber;
      const displayNameChanged = editDisplayName !== originalValues.displayName;
      const locationChanged = editLocation !== originalValues.location;
      const bioChanged = editBio !== originalValues.bio;

      // Update email separately via auth if changed
      if (emailChanged) {
        const { error: emailError } = await AuthService.updateEmail(editEmail);
        if (emailError) {
          throw new Error((emailError as any).message || t('settingsMore.err_update_email'));
        }
      }

      // Update profile fields if changed
      if (usernameChanged || phoneChanged || displayNameChanged || locationChanged || bioChanged) {
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

        if (locationChanged) {
          profileUpdates.location = editLocation.trim() || null;
        }

        if (bioChanged) {
          profileUpdates.bio = editBio.trim() || null;
        }

        const { error: profileError } = await updateProfile(profileUpdates);

        if (profileError) {
          const errorMsg = profileError.message || '';
          if (errorMsg.toLowerCase().includes('username') && errorMsg.toLowerCase().includes('already')) {
            throw new Error(t('settingsMore.err_username_taken'));
          }
          throw new Error(errorMsg || t('settingsMore.err_update_profile'));
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
        location: editLocation,
        bio: editBio,
      });

      Alert.alert(t('settingsMore.alert_success_title'), t('settingsMore.alert_profile_updated_msg'));
    } catch (error: any) {
      if (__DEV__) console.error('Error updating account info:', error);
      Alert.alert(
        t('settingsMore.alert_update_failed_title'),
        error.message || t('settingsMore.alert_update_failed_msg')
      );
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert(t('settingsMore.alert_invalid_password_title'), t('settingsMore.alert_invalid_password_msg'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('settingsMore.alert_password_mismatch_title'), t('settingsMore.alert_password_mismatch_msg'));
      return;
    }

    try {
      setSavingPassword(true);
      const { error } = await AuthService.changePassword(newPassword);

      if (error) {
        throw new Error((error as any).message || t('settingsMore.err_change_password'));
      }

      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
      Alert.alert(t('settingsMore.alert_success_title'), t('settingsMore.alert_password_changed_msg'));
    } catch (error: any) {
      if (__DEV__) console.error('Error changing password:', error);
      Alert.alert(
        t('settingsMore.alert_password_failed_title'),
        error.message || t('settingsMore.alert_password_failed_msg')
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settingsMore.alert_delete_account_title'),
      t('settingsMore.alert_delete_account_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settingsMore.delete_forever'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await AuthService.deleteAccount();
              if (error) {
                Alert.alert(t('settingsMore.alert_error_title'), t('settingsMore.alert_delete_failed_msg'));
              } else {
                onLogout();
              }
            } catch {
              Alert.alert(t('settingsMore.alert_error_title'), t('settingsMore.alert_something_wrong_msg'));
            }
          },
        },
      ]
    );
  };

  const handleLogoutPress = () => {
    Alert.alert(t('settingsMore.alert_logout_title'), t('settingsMore.alert_logout_msg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settingsMore.logout'), onPress: onLogout, style: 'destructive' },
    ]);
  };

  const renderToggleRow = (
    label: string,
    desc: string,
    value: boolean,
    onValueChange: (v: boolean) => void,
    options?: { isLast?: boolean }
  ) => (
    <View style={[styles.toggleRow, options?.isLast && styles.toggleRowLast]}>
      <View style={styles.toggleRowText}>
        <Text style={styles.toggleRowLabel}>{label}</Text>
        <Text style={styles.toggleRowDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: COLORS.bg4, true: COLORS.ember }}
        thumbColor={COLORS.white}
        ios_backgroundColor={COLORS.bg4}
      />
    </View>
  );

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
          color={options?.destructive ? COLORS.danger : COLORS.text}
        />
        <Text style={[styles.menuItemLabel, options?.destructive && styles.menuItemLabelDestructive]}>
          {label}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.text3} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('settingsMore.header_title')} onBack={onGoBack} />

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
                <Ionicons name="person" size={36} color={COLORS.white} />
              </View>
            )}
          </View>
          <Text style={styles.profileCardName}>{user?.display_name || t('settingsMore.default_user')}</Text>
          <Text style={styles.profileCardUsername}>@{user?.username || t('settingsMore.default_username')}</Text>
        </View>

        {/* Language Section */}
        <Text style={styles.sectionHeader}>{t('settings.language').toUpperCase()}</Text>
        <View style={styles.card}>
          {LANGUAGES.map((l, i) => {
            const active = locale === l.code;
            return (
              <TouchableOpacity
                key={l.code}
                style={[styles.langItem, i < LANGUAGES.length - 1 && styles.langItemBorder]}
                onPress={() => setLocale(l.code)}
                activeOpacity={0.7}
              >
                <Text style={styles.langFlag}>{l.flag}</Text>
                <Text style={[styles.langItemLabel, active && styles.langItemLabelActive]}>{l.label}</Text>
                {active && <Ionicons name="checkmark" size={20} color={COLORS.ember} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Edit Profile Section */}
        <Text style={styles.sectionHeader}>{t('settingsMore.section_edit_profile')}</Text>
        <View style={styles.card}>
          <View style={styles.editField}>
            <Text style={styles.editFieldLabel}>{t('settingsMore.label_display_name')}</Text>
            <TextInput
              style={styles.editFieldInput}
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              placeholder={t('settingsMore.placeholder_display_name')}
              placeholderTextColor={COLORS.text3}
              autoCapitalize="words"
            />
          </View>
          <View style={styles.editFieldSeparator} />

          <View style={styles.editField}>
            <Text style={[styles.editFieldLabel, !!errors.username && styles.editFieldLabelError]}>{t('settingsMore.label_username')}</Text>
            <TextInput
              style={styles.editFieldInput}
              value={editUsername}
              onChangeText={(v) => { setEditUsername(v); if (errors.username) setErrors((e) => ({ ...e, username: undefined })); }}
              placeholder={t('settingsMore.placeholder_username')}
              placeholderTextColor={COLORS.text3}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!errors.username && <Text style={styles.fieldError}>{errors.username}</Text>}
          </View>
          <View style={styles.editFieldSeparator} />

          <View style={styles.editField}>
            <Text style={[styles.editFieldLabel, !!errors.email && styles.editFieldLabelError]}>{t('settingsMore.label_email')}</Text>
            <TextInput
              style={styles.editFieldInput}
              value={editEmail}
              onChangeText={(v) => { setEditEmail(v); if (errors.email) setErrors((e) => ({ ...e, email: undefined })); }}
              placeholder={t('settingsMore.placeholder_email')}
              placeholderTextColor={COLORS.text3}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}
          </View>
          <View style={styles.editFieldSeparator} />

          <View style={styles.editField}>
            <Text style={[styles.editFieldLabel, !!errors.phone && styles.editFieldLabelError]}>{t('settingsMore.label_phone')}</Text>
            <TextInput
              style={styles.editFieldInput}
              value={editPhoneNumber}
              onChangeText={(v) => { setEditPhoneNumber(v); if (errors.phone) setErrors((e) => ({ ...e, phone: undefined })); }}
              placeholder={t('settingsMore.placeholder_phone')}
              placeholderTextColor={COLORS.text3}
              keyboardType="phone-pad"
            />
            {!!errors.phone && <Text style={styles.fieldError}>{errors.phone}</Text>}
          </View>
          <View style={styles.editFieldSeparator} />

          <View style={styles.editField}>
            <Text style={styles.editFieldLabel}>{t('settingsMore.label_location')}</Text>
            <TextInput
              style={styles.editFieldInput}
              value={editLocation}
              onChangeText={setEditLocation}
              placeholder={t('settingsMore.placeholder_location')}
              placeholderTextColor={COLORS.text3}
              autoCapitalize="words"
            />
          </View>
          <View style={styles.editFieldSeparator} />

          <View style={styles.editFieldLast}>
            <Text style={styles.editFieldLabel}>{t('settingsMore.label_bio')}</Text>
            <TextInput
              style={[styles.editFieldInput, styles.bioInput]}
              value={editBio}
              onChangeText={(v) => setEditBio(v.slice(0, 160))}
              placeholder={t('settingsMore.placeholder_bio')}
              placeholderTextColor={COLORS.text3}
              multiline
              maxLength={160}
            />
            <Text style={styles.bioCounter}>{editBio.length}/160</Text>
          </View>

          {hasChanges && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveInfo}
              activeOpacity={0.7}
              disabled={savingInfo}
            >
              {savingInfo ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.saveButtonText}>{t('settingsMore.btn_save_changes')}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Change Password Section */}
        <Text style={styles.sectionHeader}>{t('settingsMore.section_change_password')}</Text>
        <View style={styles.card}>
          {!showPasswordChange ? (
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => setShowPasswordChange(true)}
              activeOpacity={0.6}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.text} />
                <Text style={styles.menuItemLabel}>{t('settingsMore.menu_change_password')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.text3} />
            </TouchableOpacity>
          ) : (
            <View>
              <View style={styles.editField}>
                <Text style={styles.editFieldLabel}>{t('settingsMore.label_new_password')}</Text>
                <TextInput
                  style={styles.editFieldInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t('settingsMore.placeholder_new_password')}
                  placeholderTextColor={COLORS.text3}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.editFieldSeparator} />

              <View style={styles.editFieldLast}>
                <Text style={styles.editFieldLabel}>{t('settingsMore.label_confirm_password')}</Text>
                <TextInput
                  style={styles.editFieldInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('settingsMore.placeholder_confirm_password')}
                  placeholderTextColor={COLORS.text3}
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
                  <Text style={styles.passwordCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, { flex: 1, marginHorizontal: 0, marginLeft: 8 }]}
                  onPress={handleChangePassword}
                  activeOpacity={0.7}
                  disabled={savingPassword}
                >
                  {savingPassword ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.saveButtonText}>{t('settingsMore.btn_update_password')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Notifications Section */}
        <Text style={styles.sectionHeader}>{t('settingsMore.section_notifications', { defaultValue: 'Notifications' }).toUpperCase()}</Text>
        <View style={styles.card}>
          {renderToggleRow(
            t('settingsMore.notif_push_label', { defaultValue: 'Push notifications' }),
            t('settingsMore.notif_push_desc', { defaultValue: 'Get notified when caps unlock' }),
            prefs.notif_push,
            (v) => updatePref('notif_push', v)
          )}
          {renderToggleRow(
            t('settingsMore.notif_email_label', { defaultValue: 'Email notifications' }),
            t('settingsMore.notif_email_desc', { defaultValue: 'Weekly digest of activity' }),
            prefs.notif_email,
            (v) => updatePref('notif_email', v)
          )}
          {renderToggleRow(
            t('settingsMore.notif_marketing_label', { defaultValue: 'Marketing emails' }),
            t('settingsMore.notif_marketing_desc', { defaultValue: 'News and product updates' }),
            prefs.notif_marketing,
            (v) => updatePref('notif_marketing', v),
            { isLast: true }
          )}
        </View>

        {/* Privacy Section */}
        <Text style={styles.sectionHeader}>{t('settingsMore.section_privacy', { defaultValue: 'Privacy' }).toUpperCase()}</Text>
        <View style={styles.card}>
          {renderToggleRow(
            t('settingsMore.privacy_public_label', { defaultValue: 'Public profile' }),
            t('settingsMore.privacy_public_desc', { defaultValue: 'Anyone can find and view your profile' }),
            prefs.privacy_public,
            (v) => updatePref('privacy_public', v)
          )}
          {renderToggleRow(
            t('settingsMore.privacy_location_label', { defaultValue: 'Share location' }),
            t('settingsMore.privacy_location_desc', { defaultValue: 'Allow location features' }),
            prefs.privacy_location,
            (v) => updatePref('privacy_location', v)
          )}
          {renderToggleRow(
            t('settingsMore.privacy_messages_label', { defaultValue: 'Messages from anyone' }),
            t('settingsMore.privacy_messages_desc', { defaultValue: 'Strangers can message you' }),
            prefs.privacy_messages,
            (v) => updatePref('privacy_messages', v),
            { isLast: true }
          )}
        </View>

        {/* Default Home Layout Section */}
        <Text style={styles.sectionHeader}>{t('settingsMore.section_home_layout', { defaultValue: 'Default home layout' }).toUpperCase()}</Text>
        <View style={styles.card}>
          <View style={styles.segmented}>
            {HOME_LAYOUTS.map((opt) => {
              const active = prefs.home_layout === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => updatePref('home_layout', opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                    {t(opt.labelKey, { defaultValue: opt.defaultValue })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Account Group */}
        <Text style={styles.sectionHeader}>{t('settingsMore.section_account')}</Text>
        <View style={styles.card}>
          {renderMenuItem('notifications-outline', t('settingsMore.menu_notifications'), () => onNavigate('Notifications'), { isLast: true })}
        </View>

        {/* Support Group */}
        <Text style={styles.sectionHeader}>{t('settingsMore.section_support')}</Text>
        <View style={styles.card}>
          {renderMenuItem('help-circle-outline', t('settingsMore.menu_help_support'), () => {
            Alert.alert(t('settingsMore.alert_help_title'), t('settingsMore.alert_help_msg'));
          })}
          {renderMenuItem('document-text-outline', t('settingsMore.menu_terms', { defaultValue: 'Terms of Service' }), () => {
            Linking.openURL('https://voorcap.com/terms');
          })}
          {renderMenuItem('shield-checkmark-outline', t('settingsMore.menu_privacy', { defaultValue: 'Privacy Policy' }), () => {
            Linking.openURL('https://voorcap.com/privacy');
          })}
          {renderMenuItem('information-circle-outline', t('settingsMore.menu_about'), () => {
            Alert.alert(t('settingsMore.alert_about_title'), t('settingsMore.alert_about_msg'));
          }, { isLast: true })}
        </View>

        {/* Actions Group */}
        <Text style={styles.sectionHeader}>{t('settingsMore.section_actions')}</Text>
        <View style={styles.card}>
          {renderMenuItem('log-out-outline', t('settingsMore.menu_logout'), handleLogoutPress, { destructive: true })}
          {renderMenuItem('trash-outline', t('settingsMore.menu_delete_account'), handleDeleteAccount, { destructive: true, isLast: true })}
        </View>

        {/* Version */}
        <Text style={styles.versionText}>Voorcap v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
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
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.ember,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCardName: {
    ...font('title'),
    color: COLORS.text,
    marginBottom: 2,
  },
  profileCardUsername: {
    fontSize: 15,
    color: COLORS.text3,
  },
  // Section Header
  sectionHeader: {
    ...font('eyebrow'),
    color: COLORS.text2,
    marginBottom: 8,
    marginLeft: 4,
  },
  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.border,
    marginLeft: 16,
  },
  editFieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text2,
    marginBottom: 4,
  },
  editFieldInput: {
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 4,
  },
  editFieldLabelError: {
    color: COLORS.danger,
  },
  fieldError: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 6,
  },
  bioInput: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  bioCounter: {
    ...font('caption'),
    color: COLORS.text3,
    textAlign: 'right',
    marginTop: 2,
  },
  // Save Button
  saveButton: {
    backgroundColor: COLORS.ember,
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
    color: COLORS.white,
  },
  // Menu Items
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  langItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  langFlag: { fontSize: 22 },
  langItemLabel: {
    ...font('body'),
    color: COLORS.text,
    flex: 1,
  },
  langItemLabelActive: {
    color: COLORS.ember,
    ...font('bodyBold'),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
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
    color: COLORS.text,
  },
  menuItemLabelDestructive: {
    color: COLORS.danger,
  },
  // Toggle Rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  toggleRowLast: {
    borderBottomWidth: 0,
  },
  toggleRowText: {
    flex: 1,
    paddingRight: 12,
  },
  toggleRowLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  toggleRowDesc: {
    ...font('caption'),
    color: COLORS.text3,
    marginTop: 2,
  },
  // Segmented Control (home layout)
  segmented: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: COLORS.bg3,
  },
  segmentActive: {
    backgroundColor: COLORS.ember,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text2,
  },
  segmentLabelActive: {
    color: COLORS.white,
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
    backgroundColor: COLORS.bg3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passwordCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text2,
  },
  // Version
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.text3,
    marginTop: 8,
    marginBottom: 20,
  },
});

export default AccountSettingsScreen;
