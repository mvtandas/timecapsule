import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, font, SHADOWS } from '../../constants/theme';
import { VoorcapWordmark } from '../../components/common/VoorcapLogo';
import SocialAuthButtons from '../../components/auth/SocialAuthButtons';
import { useT } from '../../i18n';

const { height } = Dimensions.get('window');

interface WelcomeScreenProps {
  onNavigate: (screen: 'Welcome' | 'Login' | 'Signup') => void;
  onGoBack?: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNavigate }) => {
  const t = useT();
  const handleGetStarted = () => {
    onNavigate('Signup');
  };

  const handleLogin = () => {
    onNavigate('Login');
  };

  return (
    <View style={styles.container}>
      {/* Header with background image */}
      <ImageBackground
        source={require('../../../assets/welcome-bg.jpg')}
        style={styles.headerImage}
        imageStyle={styles.imageStyle}
      >
        <LinearGradient
          colors={['transparent', 'rgba(11, 14, 19, 0.75)', 'rgba(11, 14, 19, 0.98)']}
          style={styles.gradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.wordmark}>
              <VoorcapWordmark size={26} color={COLORS.text} />
            </View>
            <Text style={[styles.title, font('display')]}>{t('welcome.tagline')}</Text>
            <Text style={styles.subtitle}>
              {t('welcome.blurb')}
            </Text>
          </View>
        </LinearGradient>
      </ImageBackground>

      {/* Button Section */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>{t('welcome.getStarted')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>{t('welcome.logIn')}</Text>
        </TouchableOpacity>

        <SocialAuthButtons showDivider />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  headerImage: {
    flex: 1,
    minHeight: height * 0.55,
  },
  imageStyle: {
    resizeMode: 'cover',
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  headerContent: {
    paddingHorizontal: 24,
  },
  wordmark: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 34,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text2,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 50,
    gap: 16,
    backgroundColor: COLORS.bg,
  },
  primaryButton: {
    width: '100%',
    height: 56,
    backgroundColor: COLORS.ember,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.glow(COLORS.ember),
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    width: '100%',
    height: 56,
    backgroundColor: COLORS.emberSoft,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  secondaryButtonText: {
    color: COLORS.ember,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default WelcomeScreen;
