import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AuthService } from '../../lib/auth';
import { COLORS, font } from '../../constants/theme';
import { useT } from '../../i18n';

interface Props {
  /** Optional divider label shown above the buttons (e.g. "or"). */
  showDivider?: boolean;
  /** Called after a session is established (navigation is otherwise store-driven). */
  onSuccess?: () => void;
}

/**
 * Sign in with Apple + Google. Renders the native Apple button on iOS (when
 * available) and a themed Google button everywhere. On success the auth store's
 * onAuthStateChange sets `user`, which flips the app to the authed stack.
 */
const SocialAuthButtons: React.FC<Props> = ({ showDivider = true, onSuccess }) => {
  const t = useT();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<null | 'apple' | 'google'>(null);

  useEffect(() => {
    let mounted = true;
    AuthService.isAppleAuthAvailable().then((ok) => {
      if (mounted) setAppleAvailable(ok);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handle = async (provider: 'apple' | 'google') => {
    if (busy) return;
    setBusy(provider);
    const { error, canceled } =
      provider === 'apple'
        ? await AuthService.signInWithApple()
        : await AuthService.signInWithGoogle();
    setBusy(null);
    if (canceled) return;
    if (error) {
      Alert.alert(
        t('auth.social_failed_title', { defaultValue: 'Sign-in failed' }),
        (error as any)?.message || t('auth.social_failed_msg', { defaultValue: 'Could not sign in. Please try again.' })
      );
      return;
    }
    onSuccess?.();
  };

  // Nothing to show if neither provider can render (shouldn't happen — Google
  // always renders — but keeps the divider from being orphaned).
  const showApple = Platform.OS === 'ios' && appleAvailable;

  return (
    <View style={styles.wrap}>
      {showDivider && (
        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>{t('common.or', { defaultValue: 'or' })}</Text>
          <View style={styles.line} />
        </View>
      )}

      {showApple && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={16}
          style={styles.appleButton}
          onPress={() => handle('apple')}
        />
      )}

      <TouchableOpacity
        style={styles.googleButton}
        onPress={() => handle('google')}
        disabled={busy !== null}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('auth.continue_google', { defaultValue: 'Continue with Google' })}
      >
        {busy === 'google' ? (
          <ActivityIndicator color={COLORS.text} />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color={COLORS.text} style={styles.googleIcon} />
            <Text style={styles.googleText}>{t('auth.continue_google', { defaultValue: 'Continue with Google' })}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: COLORS.text3,
  },
  appleButton: {
    width: '100%',
    height: 54,
  },
  googleButton: {
    width: '100%',
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleText: {
    ...font('label'),
    fontSize: 16,
    color: COLORS.text,
  },
});

export default SocialAuthButtons;
