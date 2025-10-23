import 'react-native-url-polyfill/auto';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from './src/store/authStore';
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import DashboardScreen from './src/screens/dashboard/DashboardScreen';
import CreateCapsuleScreen from './src/screens/capsules/CreateCapsuleScreen';
import ExploreScreen from './src/screens/explore/ExploreScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';

type Screen = 'Welcome' | 'Login' | 'Signup' | 'Dashboard' | 'Create' | 'Explore' | 'Profile';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('Welcome');
  const { user, loading, refreshSession, signOut } = useAuthStore();

  useEffect(() => {
    // Check for existing session on app load
    refreshSession();
  }, []);

  useEffect(() => {
    // If user is authenticated, go to Dashboard
    if (user && currentScreen === 'Welcome') {
      setCurrentScreen('Dashboard');
    }
    // If user logs out, go to Welcome
    if (!user && !loading && (currentScreen === 'Dashboard' || currentScreen === 'Create' || currentScreen === 'Explore' || currentScreen === 'Profile')) {
      setCurrentScreen('Welcome');
    }
  }, [user, loading]);

  const navigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const handleLogin = () => {
    setCurrentScreen('Dashboard');
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentScreen('Welcome');
  };

  // Show loading screen while checking auth
  if (loading && !user && currentScreen === 'Welcome') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FAC638" />
      </View>
    );
  }

  return (
    <>
      {currentScreen === 'Welcome' && <WelcomeScreen onNavigate={navigate} />}
      {currentScreen === 'Login' && <LoginScreen onNavigate={navigate} onLogin={handleLogin} />}
      {currentScreen === 'Signup' && <SignupScreen onNavigate={navigate} onSignup={handleLogin} />}
      {currentScreen === 'Dashboard' && <DashboardScreen onNavigate={navigate} onLogout={handleLogout} />}
      {currentScreen === 'Create' && <CreateCapsuleScreen onNavigate={navigate} />}
      {currentScreen === 'Explore' && <ExploreScreen onNavigate={navigate} />}
      {currentScreen === 'Profile' && <ProfileScreen onNavigate={navigate} onLogout={handleLogout} />}
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8f8f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});