import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { COLORS, font, SHADOWS } from '../../constants/theme';
import { VoorcapMark } from '../../components/common/VoorcapLogo';
import SocialAuthButtons from '../../components/auth/SocialAuthButtons';
import { useT } from '../../i18n';

interface SignupScreenProps {
  onNavigate: (screen: 'Welcome' | 'Login' | 'Signup') => void;
  onSignup: () => void;
  onGoBack?: () => void;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ onNavigate, onSignup, onGoBack }) => {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ displayName?: string; username?: string; email?: string; password?: string; confirmPassword?: string }>({});
  const { signUp } = useAuthStore();

  // Refs for keyboard navigation
  const displayNameRef = useRef<TextInput>(null);
  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const validateUsername = (username: string): { valid: boolean; message?: string } => {
    // Check length
    if (username.length < 3 || username.length > 20) {
      return { valid: false, message: t('auth.username_len_msg') };
    }

    // Check allowed characters (letters, numbers, underscores, periods)
    const usernameRegex = /^[a-zA-Z0-9_.]+$/;
    if (!usernameRegex.test(username)) {
      return { valid: false, message: t('auth.username_chars_msg') };
    }

    // Check if it starts with a letter or number
    if (!/^[a-zA-Z0-9]/.test(username)) {
      return { valid: false, message: t('auth.username_start_msg') };
    }

    return { valid: true };
  };

  const handleSignUp = async () => {
    // Inline field validation
    const fe: { displayName?: string; username?: string; email?: string; password?: string; confirmPassword?: string } = {};
    if (!displayName.trim()) fe.displayName = t('auth.required_field');
    if (!username.trim()) fe.username = t('auth.required_field');
    else { const u = validateUsername(username); if (!u.valid) fe.username = u.message; }
    if (!email.trim()) fe.email = t('auth.required_field');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fe.email = t('auth.invalid_email');
    if (!password) fe.password = t('auth.required_field');
    else if (password.length < 6) fe.password = t('auth.password_short_msg');
    if (!confirmPassword) fe.confirmPassword = t('auth.required_field');
    else if (password !== confirmPassword) fe.confirmPassword = t('auth.password_mismatch_msg');
    if (Object.keys(fe).length) { setErrors(fe); return; }
    setErrors({});

    setLoading(true);
    
    const { error } = await signUp(email, password, displayName, username);
    
    setLoading(false);
    
    if (error) {
      // Check for username uniqueness error
      const errorMessage = error.message || '';
      if (errorMessage.toLowerCase().includes('username') && errorMessage.toLowerCase().includes('already')) {
        Alert.alert(t('auth.username_taken_title'), t('auth.username_taken_msg'));
      } else {
        Alert.alert(t('auth.error_title'), errorMessage || t('auth.signup_failed_msg'));
      }
    } else {
      Alert.alert(
        t('auth.signup_success_title'),
        t('auth.signup_success_msg'),
        [
          {
            text: t('common.ok'),
            onPress: onSignup
          }
        ]
      );
    }
  };
  
  const handleBack = () => {
    onGoBack && onGoBack();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Back Button */}
      <TouchableOpacity style={[styles.backButton, { top: insets.top + 4 }]} onPress={handleBack}>
        <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 36 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <VoorcapMark size={52} />
          </View>
          <Text style={[styles.title, font('display')]}>{t('auth.createAccount')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.signUpSub')}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <View style={[styles.inputContainer, !!errors.displayName && styles.inputError]}>
            <MaterialIcons name="person" size={24} color={COLORS.text3} style={styles.inputIcon} />
            <TextInput
              ref={displayNameRef}
              value={displayName}
              onChangeText={(v) => { setDisplayName(v); if (errors.displayName) setErrors((e) => ({ ...e, displayName: undefined })); }}
              placeholder={t('auth.fullName')}
              placeholderTextColor={COLORS.text3}
              autoCapitalize="words"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              textContentType="none"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => usernameRef.current?.focus()}
              style={styles.input}
              editable={!loading}
            />
          </View>
          {!!errors.displayName && <Text style={styles.fieldError}>{errors.displayName}</Text>}

          <View style={[styles.inputContainer, !!errors.username && styles.inputError]}>
            <MaterialIcons name="alternate-email" size={24} color={COLORS.text3} style={styles.inputIcon} />
            <TextInput
              ref={usernameRef}
              value={username}
              onChangeText={(v) => { setUsername(v); if (errors.username) setErrors((e) => ({ ...e, username: undefined })); }}
              placeholder={t('auth.usernameHint')}
              placeholderTextColor={COLORS.text3}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              textContentType="none"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => emailRef.current?.focus()}
              style={styles.input}
              editable={!loading}
            />
          </View>
          {!!errors.username && <Text style={styles.fieldError}>{errors.username}</Text>}

          <View style={[styles.inputContainer, !!errors.email && styles.inputError]}>
            <MaterialIcons name="email" size={24} color={COLORS.text3} style={styles.inputIcon} />
            <TextInput
              ref={emailRef}
              value={email}
              onChangeText={(v) => { setEmail(v); if (errors.email) setErrors((e) => ({ ...e, email: undefined })); }}
              placeholder={t('auth.emailAddress')}
              placeholderTextColor={COLORS.text3}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              textContentType="none"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
              style={styles.input}
              editable={!loading}
            />
          </View>
          {!!errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}

          <View style={[styles.inputContainer, !!errors.password && styles.inputError]}>
            <MaterialIcons name="lock" size={24} color={COLORS.text3} style={styles.inputIcon} />
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={(v) => { setPassword(v); if (errors.password) setErrors((e) => ({ ...e, password: undefined })); }}
              placeholder={t('auth.passwordHint')}
              placeholderTextColor={COLORS.text3}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              textContentType="oneTimeCode"
              importantForAutofill="no"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              style={styles.input}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t('auth.togglePassword')}
            >
              <MaterialIcons
                name={showPassword ? "visibility" : "visibility-off"}
                size={24}
                color={COLORS.text3}
              />
            </TouchableOpacity>
          </View>
          {!!errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}

          <View style={[styles.inputContainer, !!errors.confirmPassword && styles.inputError]}>
            <MaterialIcons name="lock" size={24} color={COLORS.text3} style={styles.inputIcon} />
            <TextInput
              ref={confirmPasswordRef}
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); if (errors.confirmPassword) setErrors((e) => ({ ...e, confirmPassword: undefined })); }}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              placeholderTextColor={COLORS.text3}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              textContentType="oneTimeCode"
              importantForAutofill="no"
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
              style={styles.input}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t('auth.togglePassword')}
            >
              <MaterialIcons
                name={showConfirmPassword ? "visibility" : "visibility-off"}
                size={24}
                color={COLORS.text3}
              />
            </TouchableOpacity>
          </View>
          {!!errors.confirmPassword && <Text style={styles.fieldError}>{errors.confirmPassword}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <Text style={styles.buttonText}>{t('auth.creatingAccount')}</Text>
            ) : (
              <Text style={styles.buttonText}>{t('auth.signUp')}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.termsText}>
            {t('auth.termsPrefix')}{'\n'}
            <Text style={styles.termsLink} onPress={() => Alert.alert(t('auth.termsOfService'), 'By using Voorcap, you agree to use the app responsibly. You must be at least 13 years old. Do not post harmful, illegal, or inappropriate content. We may remove content or suspend accounts that violate these terms. Your data is stored securely on our servers. We reserve the right to update these terms at any time.')}>{t('auth.termsOfService')}</Text> {t('auth.termsAnd')}{' '}
            <Text style={styles.termsLink} onPress={() => Alert.alert(t('auth.privacyPolicy'), 'Voorcap collects your email, username, profile photo, and location data to provide the app service. Your cap content (photos, videos, messages) is stored on secure servers. We do not sell your data to third parties. You can delete your account and all associated data at any time from Settings. We use location data only to place and discover caps on the map. For questions, contact support@voorcap.app')}>{t('auth.privacyPolicy')}</Text>
          </Text>
        </View>

        {/* Social sign-up */}
        <View style={styles.socialWrap}>
          <SocialAuthButtons showDivider />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => onNavigate('Login')}>
            <Text style={styles.footerText}>
              {t('auth.haveAccount')}
              <Text style={styles.footerLink}>{t('auth.signIn')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollView: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bg3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.emberSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text2,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg3,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 56,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  fieldError: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 6,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: COLORS.text,
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: COLORS.ember,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    ...SHADOWS.glow(COLORS.ember),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  termsText: {
    fontSize: 12,
    color: COLORS.text2,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.ember,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  socialWrap: {
    marginTop: 20,
    marginBottom: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: COLORS.text3,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.text2,
  },
  footerLink: {
    color: COLORS.ember,
    fontWeight: 'bold',
  },
});

export default SignupScreen;

