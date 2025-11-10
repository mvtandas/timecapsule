import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

interface WelcomeScreenProps {
  onNavigate: (screen: 'Welcome' | 'Login' | 'Signup') => void;
  onGoBack?: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNavigate }) => {
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
        source={{ uri: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800' }}
        style={styles.headerImage}
        imageStyle={styles.imageStyle}
      >
        <LinearGradient
          colors={['transparent', 'rgba(35, 30, 15, 0.7)', 'rgba(35, 30, 15, 0.95)']}
          style={styles.gradient}
        >
          <View style={styles.headerContent}>
            <Text style={styles.title}>Capture Moments,{'\n'}Share Memories</Text>
            <Text style={styles.subtitle}>
              Create digital capsules with memories, messages, and content linked to specific times and locations.
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
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Log In</Text>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 50,
    gap: 16,
    backgroundColor: '#f8f8f5',
  },
  primaryButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#FAC638',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FAC638',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    width: '100%',
    height: 56,
    backgroundColor: 'rgba(250, 198, 56, 0.2)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FAC638',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default WelcomeScreen;
