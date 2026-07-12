import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { AuthService } from '../../lib/auth';
import { COLORS, font, SHADOWS } from '../../constants/theme';
import { VoorcapMark } from '../../components/common/VoorcapLogo';
import SocialAuthButtons from '../../components/auth/SocialAuthButtons';
import { useT } from '../../i18n';

interface LoginScreenProps {
  onNavigate: (screen: 'Welcome' | 'Login' | 'Signup') => void;
  onLogin: () => void;
  onGoBack?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigate, onLogin, onGoBack }) => {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [identifier, setIdentifier] = useState(''); // Can be username or email
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const { signIn } = useAuthStore();

  // Refs for keyboard navigation
  const identifierRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleSignIn = async () => {
    const fieldErrors: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) fieldErrors.identifier = t('auth.required_field');
    if (!password) fieldErrors.password = t('auth.required_field');
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setLoading(true);
    
    const { error } = await signIn(identifier, password);
    
    setLoading(false);
    
    if (error) {
      Alert.alert(
        t('auth.login_failed_title'),
        error.message || t('auth.login_failed_msg')
      );
    } else {
      Alert.alert(t('auth.success_title'), t('auth.welcome_back_msg'));
      onLogin();
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

      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <VoorcapMark size={52} />
          </View>
          <Text style={[styles.title, font('display')]}>{t('auth.welcomeBack')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.signInSub')}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <View style={[styles.inputContainer, !!errors.identifier && styles.inputError]}>
            <MaterialIcons name="person" size={24} color={COLORS.text3} style={styles.inputIcon} />
            <TextInput
              ref={identifierRef}
              value={identifier}
              onChangeText={(v) => { setIdentifier(v); if (errors.identifier) setErrors((e) => ({ ...e, identifier: undefined })); }}
              placeholder={t('auth.usernameOrEmail')}
              placeholderTextColor={COLORS.text3}
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
          {!!errors.identifier && <Text style={styles.fieldError}>{errors.identifier}</Text>}

          <View style={[styles.inputContainer, !!errors.password && styles.inputError]}>
            <MaterialIcons name="lock" size={24} color={COLORS.text3} style={styles.inputIcon} />
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={(v) => { setPassword(v); if (errors.password) setErrors((e) => ({ ...e, password: undefined })); }}
              placeholder={t('auth.password')}
              placeholderTextColor={COLORS.text3}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              textContentType="oneTimeCode"
              importantForAutofill="no"
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
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

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <Text style={styles.buttonText}>{t('auth.signingIn')}</Text>
            ) : (
              <Text style={styles.buttonText}>{t('auth.signIn')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotPassword} onPress={() => {
            if (!identifier) {
              Alert.alert(t('auth.email_required_title'), t('auth.email_required_msg'));
              return;
            }
            const email = identifier.includes('@') ? identifier : '';
            if (!email) {
              Alert.alert(t('auth.email_required_title'), t('auth.email_for_reset_msg'));
              return;
            }
            AuthService.resetPassword(email).then(({ error }: any) => {
              if (error) Alert.alert(t('auth.error_title'), t('auth.reset_failed_msg'));
              else Alert.alert(t('auth.reset_sent_title'), t('auth.reset_sent_msg'));
            });
          }}>
            <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          <View style={styles.socialWrap}>
            <SocialAuthButtons showDivider onSuccess={onLogin} />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => onNavigate('Signup')}>
            <Text style={styles.footerText}>
              {t('auth.noAccount')}
              <Text style={styles.footerLink}>{t('auth.signUp')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
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
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
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
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg3,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
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
    marginTop: -14,
    marginBottom: 12,
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
  forgotPassword: {
    alignSelf: 'center',
    marginTop: 8,
  },
  socialWrap: {
    marginTop: 24,
  },
  forgotPasswordText: {
    color: COLORS.ember,
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: COLORS.ember,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
  infoText: {
    fontSize: 14,
    color: COLORS.text2,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
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

export default LoginScreen;
