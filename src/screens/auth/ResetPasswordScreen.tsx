import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthService } from '../../lib/auth';
import { COLORS, font, SHADOWS } from '../../constants/theme';
import { VoorcapMark } from '../../components/common/VoorcapLogo';
import { useT } from '../../i18n';

interface ResetPasswordScreenProps {
  /** Called when the flow ends. `changed` = the password was successfully updated. */
  onDone: (changed: boolean) => void;
}

const MIN_LENGTH = 8;

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ onDone }) => {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const confirmRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    const fieldErrors: { password?: string; confirm?: string } = {};
    if (password.length < MIN_LENGTH) {
      fieldErrors.password = t('reset.too_short', { defaultValue: `Password must be at least ${MIN_LENGTH} characters`, count: MIN_LENGTH });
    }
    if (confirm !== password) {
      fieldErrors.confirm = t('reset.mismatch', { defaultValue: 'Passwords do not match' });
    }
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setLoading(true);
    const { error } = await AuthService.changePassword(password);
    setLoading(false);

    if (error) {
      Alert.alert(
        t('reset.failed_title', { defaultValue: 'Could not update password' }),
        (error as any)?.message || t('reset.failed_msg', { defaultValue: 'Please try again.' })
      );
      return;
    }

    Alert.alert(
      t('reset.success_title', { defaultValue: 'Password updated' }),
      t('reset.success_msg', { defaultValue: 'Your password has been changed. You can now use it to sign in.' }),
      [{ text: t('common.ok', { defaultValue: 'OK' }), onPress: () => onDone(true) }]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <VoorcapMark size={52} />
          </View>
          <Text style={[styles.title, font('display')]}>{t('reset.title', { defaultValue: 'Set a new password' })}</Text>
          <Text style={styles.subtitle}>
            {t('reset.subtitle', { defaultValue: 'Choose a new password for your account.' })}
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={[styles.inputContainer, !!errors.password && styles.inputError]}>
            <MaterialIcons name="lock" size={24} color={COLORS.text3} style={styles.inputIcon} />
            <TextInput
              value={password}
              onChangeText={(v) => { setPassword(v); if (errors.password) setErrors((e) => ({ ...e, password: undefined })); }}
              placeholder={t('reset.new_password', { defaultValue: 'New password' })}
              placeholderTextColor={COLORS.text3}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => confirmRef.current?.focus()}
              style={styles.input}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t('auth.togglePassword', { defaultValue: 'Toggle password visibility' })}
            >
              <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={24} color={COLORS.text3} />
            </TouchableOpacity>
          </View>
          {!!errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}

          <View style={[styles.inputContainer, !!errors.confirm && styles.inputError]}>
            <MaterialIcons name="lock-outline" size={24} color={COLORS.text3} style={styles.inputIcon} />
            <TextInput
              ref={confirmRef}
              value={confirm}
              onChangeText={(v) => { setConfirm(v); if (errors.confirm) setErrors((e) => ({ ...e, confirm: undefined })); }}
              placeholder={t('reset.confirm_password', { defaultValue: 'Confirm new password' })}
              placeholderTextColor={COLORS.text3}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              style={styles.input}
              editable={!loading}
            />
          </View>
          {!!errors.confirm && <Text style={styles.fieldError}>{errors.confirm}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? t('reset.updating', { defaultValue: 'Updating…' }) : t('reset.update', { defaultValue: 'Update password' })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancel} onPress={() => onDone(false)} disabled={loading}>
            <Text style={styles.cancelText}>{t('common.cancel', { defaultValue: 'Cancel' })}</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
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
    fontSize: 30,
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
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
  button: {
    width: '100%',
    height: 56,
    backgroundColor: COLORS.ember,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
  cancel: {
    alignSelf: 'center',
    padding: 8,
  },
  cancelText: {
    color: COLORS.text2,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ResetPasswordScreen;
