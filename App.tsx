import 'react-native-url-polyfill/auto';
import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Animated, Dimensions, SafeAreaView } from 'react-native';
import { useAuthStore } from './src/store/authStore';
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import DashboardScreen from './src/screens/dashboard/DashboardScreen';
import MyCapsulesScreen from './src/screens/dashboard/MyCapsulesScreen';
import CreateCapsuleScreen from './src/screens/capsules/CreateCapsuleScreen';
import ExploreScreen from './src/screens/explore/ExploreScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import FriendProfileScreen from './src/screens/friends/FriendProfileScreen';
import FriendsScreen from './src/screens/friends/FriendsScreen';
import AccountSettingsScreen from './src/screens/profile/AccountSettingsScreen';
import BottomTabBar from './src/components/common/BottomTabBar';
import { Friend } from './src/types';

type Screen = 'Welcome' | 'Login' | 'Signup' | 'Dashboard' | 'MyCapsules' | 'Create' | 'Explore' | 'Profile' | 'Friends' | 'FriendProfile' | 'AccountSettings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<string>('Welcome');
  const [previousScreen, setPreviousScreen] = useState<string>('Welcome');
  const [navigationData, setNavigationData] = useState<any>(null);
  const [navigationHistory, setNavigationHistory] = useState<Array<{screen: string, data?: any}>>([{screen: 'Welcome'}]);
  const { user, loading, refreshSession, signOut } = useAuthStore();
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Check for existing session on app load
    refreshSession();
  }, []);

  const navigate = (screen: string, data?: any, replace: boolean = false) => {
    if (screen === currentScreen && !replace) return;
    
    // Store navigation data if provided
    if (data) {
      setNavigationData(data);
    }
    
    // Determine animation direction
    const isForward = shouldAnimateForward(currentScreen, screen);
    
    setPreviousScreen(currentScreen);
    
    // Update navigation history
    if (replace) {
      // Replace current screen in history (for tab switching)
      setNavigationHistory(prev => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1] = { screen, data };
        return newHistory;
      });
    } else {
      // Add to navigation history (for forward navigation)
      setNavigationHistory(prev => [...prev, { screen, data }]);
    }
    
    // Animate out current screen
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: isForward ? -SCREEN_WIDTH : SCREEN_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Switch screen
      setCurrentScreen(screen);
      
      // Reset position for new screen (off-screen in opposite direction)
      slideAnim.setValue(isForward ? SCREEN_WIDTH : -SCREEN_WIDTH);
      fadeAnim.setValue(0);
      
      // Animate in new screen
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const goBack = () => {
    if (navigationHistory.length <= 1) {
      // Already at the first screen, can't go back
      return;
    }
    
    // Remove current screen from history
    const newHistory = [...navigationHistory];
    newHistory.pop();
    setNavigationHistory(newHistory);
    
    // Get previous screen
    const previous = newHistory[newHistory.length - 1];
    
    // Navigate to previous screen
    const isForward = false; // Going back is always backward animation
    
    if (previous.data) {
      setNavigationData(previous.data);
    }
    
    setPreviousScreen(currentScreen);
    
    // Animate out current screen
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH, // Always slide right (backward)
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Switch screen
      setCurrentScreen(previous.screen);
      
      // Reset position for previous screen (from left)
      slideAnim.setValue(-SCREEN_WIDTH);
      fadeAnim.setValue(0);
      
      // Animate in previous screen
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  // Determine if navigation is forward (right-to-left) or backward (left-to-right)
  const shouldAnimateForward = (from: string, to: string): boolean => {
    // Bottom tab navigation (horizontal swipe between Friends, Dashboard, Profile)
    const tabOrder = ['Friends', 'Dashboard', 'Profile'];
    const fromIndex = tabOrder.indexOf(from);
    const toIndex = tabOrder.indexOf(to);
    
    if (fromIndex !== -1 && toIndex !== -1) {
      return toIndex > fromIndex; // Right if moving to higher index, left if lower
    }
    
    // Navigation from tab screens to other screens
    if (from === 'Dashboard' && to === 'FriendProfile') return true;
    if (from === 'Friends' && to === 'FriendProfile') return true;
    
    // Profile navigation from Dashboard should animate forward (right-to-left)
    if (from === 'Dashboard' && to === 'Profile') return true;
    // Going back to Dashboard from Profile should animate backward (left-to-right)
    if (from === 'Profile' && to === 'Dashboard') return false;
    
    // AccountSettings navigation from Profile should animate forward
    if (from === 'Profile' && to === 'AccountSettings') return true;
    // Going back to Profile from AccountSettings should animate backward
    if (from === 'AccountSettings' && to === 'Profile') return false;
    
    // MyCapsules navigation from Profile should animate forward
    if (from === 'Profile' && to === 'MyCapsules') return true;
    // Going back to Profile from MyCapsules should animate backward
    if (from === 'MyCapsules' && to === 'Profile') return false;
    
    // Going back to Dashboard from other screens (backward)
    if (to === 'Dashboard' && (from === 'MyCapsules' || from === 'Create' || from === 'Explore')) return false;
    
    // Forward navigation from Dashboard to other main screens
    if (from === 'Dashboard' && (to === 'Create' || to === 'MyCapsules' || to === 'Explore')) return true;
    
    // Auth flow navigation
    if (from === 'Welcome' && (to === 'Login' || to === 'Signup')) return true;
    if ((from === 'Login' || from === 'Signup') && to === 'Welcome') return false;
    if ((from === 'Login' || from === 'Signup') && to === 'Dashboard') return true;
    
    return true; // Default to forward
  };

  useEffect(() => {
    // If user is authenticated, go to Dashboard with animation
    if (user && currentScreen === 'Welcome') {
      navigate('Dashboard');
      // Clear history and start fresh from Dashboard
      setNavigationHistory([{screen: 'Dashboard'}]);
    }
    // If user logs out, go to Welcome (handled in handleLogout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentScreen]);

  const handleLogin = () => {
    navigate('Dashboard');
    // Clear history and start fresh from Dashboard
    setNavigationHistory([{screen: 'Dashboard'}]);
  };

  const handleLogout = async () => {
    await signOut();
    // No animation for logout, just reset
    slideAnim.setValue(0);
    fadeAnim.setValue(1);
    setCurrentScreen('Welcome');
    // Reset navigation history
    setNavigationHistory([{screen: 'Welcome'}]);
  };

  // Show loading screen while checking auth
  if (loading && !user && currentScreen === 'Welcome') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FAC638" />
      </View>
    );
  }

  // Check if current screen should show bottom tabs
  const shouldShowBottomTabs = ['Dashboard', 'Friends', 'Profile'].includes(currentScreen);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.screenContainer,
            {
              transform: [{ translateX: slideAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          {currentScreen === 'Welcome' && <WelcomeScreen onNavigate={navigate} onGoBack={goBack} />}
          {currentScreen === 'Login' && <LoginScreen onNavigate={navigate} onLogin={handleLogin} onGoBack={goBack} />}
          {currentScreen === 'Signup' && <SignupScreen onNavigate={navigate} onSignup={handleLogin} onGoBack={goBack} />}
          {currentScreen === 'Dashboard' && <DashboardScreen onNavigate={navigate} onLogout={handleLogout} onGoBack={goBack} />}
          {currentScreen === 'Friends' && <FriendsScreen onNavigate={navigate} onGoBack={goBack} />}
          {currentScreen === 'MyCapsules' && <MyCapsulesScreen onNavigate={navigate} onLogout={handleLogout} onGoBack={goBack} />}
          {currentScreen === 'Create' && <CreateCapsuleScreen onNavigate={navigate} onGoBack={goBack} />}
          {currentScreen === 'Explore' && <ExploreScreen onNavigate={navigate} onGoBack={goBack} />}
          {currentScreen === 'Profile' && <ProfileScreen onNavigate={navigate} onLogout={handleLogout} onGoBack={goBack} />}
          {currentScreen === 'FriendProfile' && navigationData?.friend && (
            <FriendProfileScreen onNavigate={navigate} friend={navigationData.friend} onGoBack={goBack} />
          )}
          {currentScreen === 'AccountSettings' && <AccountSettingsScreen onNavigate={navigate} onGoBack={goBack} />}
        </Animated.View>
        
        {/* Bottom Tab Bar - Only show on main screens */}
        {shouldShowBottomTabs && user && (
          <BottomTabBar activeTab={currentScreen} onNavigate={navigate} />
        )}
        
        <StatusBar style="auto" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f5',
  },
  screenContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8f8f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});