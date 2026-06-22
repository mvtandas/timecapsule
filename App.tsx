import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { View, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';

import { useAuthStore } from './src/store/authStore';
import { useLanguage } from './src/i18n';
import { COLORS } from './src/constants/theme';

import LanguageSelectScreen from './src/screens/auth/LanguageSelectScreen';
import OnboardingScreen from './src/screens/auth/OnboardingScreen';
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
import NotificationsScreen from './src/screens/notifications/NotificationsScreen';
import AchievementsScreen from './src/screens/achievements/AchievementsScreen';
import SearchScreen from './src/screens/search/SearchScreen';
import DraftsScreen from './src/screens/drafts/DraftsScreen';
import MessagesScreen from './src/screens/messages/MessagesScreen';
import ChatScreen from './src/screens/messages/ChatScreen';
import CapScreen from './src/screens/cap/CapScreen';
import TrailStopsScreen from './src/screens/trails/TrailStopsScreen';
import SharedCapLanding from './src/screens/shared/SharedCapLanding';
import BottomTabBar from './src/components/common/BottomTabBar';

const RootStack = createNativeStackNavigator();
const Tabs = createMaterialTopTabNavigator();

// Legacy screen names used by screens' onNavigate(...) calls -> route names.
const TAB_ROUTES = new Set(['Home', 'Discover', 'Activity', 'Profile']);
const ALIAS: Record<string, string> = {
  Dashboard: 'Home',
  Explore: 'Discover',
  Notifications: 'Activity',
};

/**
 * Builds the legacy { onNavigate, onGoBack } API on top of React Navigation so
 * existing screens keep working unchanged during the migration.
 */
function makeNav(navigation: any) {
  const onNavigate = (screen: string, data?: any) => {
    const target = ALIAS[screen] || screen;
    if (TAB_ROUTES.has(target)) {
      navigation.navigate('MainTabs', { screen: target, params: data });
    } else {
      navigation.navigate(target, data);
    }
  };
  const onGoBack = () => {
    if (navigation.canGoBack && navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('MainTabs', { screen: 'Home' });
  };
  return { onNavigate, onGoBack };
}

function MainTabs() {
  const signOut = useAuthStore((s) => s.signOut);
  return (
    <Tabs.Navigator
      tabBarPosition="bottom"
      initialLayout={{ width: Dimensions.get('window').width }}
      screenOptions={{ swipeEnabled: true, lazy: true, lazyPreloadDistance: 1 }}
      sceneContainerStyle={{ backgroundColor: COLORS.bg }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tabs.Screen name="Home">
        {({ navigation }) => <DashboardScreen {...makeNav(navigation)} />}
      </Tabs.Screen>
      <Tabs.Screen name="Discover">
        {({ navigation }) => <ExploreScreen {...makeNav(navigation)} />}
      </Tabs.Screen>
      <Tabs.Screen name="Activity">
        {({ navigation }) => <NotificationsScreen {...makeNav(navigation)} />}
      </Tabs.Screen>
      <Tabs.Screen name="Profile">
        {({ navigation }) => <ProfileScreen {...makeNav(navigation)} onLogout={signOut} />}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}

function AuthStack({ pendingCap }: { pendingCap?: string | null }) {
  return (
    <RootStack.Navigator
      // When a logged-OUT user arrives via a cap deep link, open the branded
      // shared-cap landing first; the cap id is held in App state and the cap
      // opens automatically once auth resolves. Otherwise start at Welcome.
      initialRouteName={pendingCap ? 'SharedCapLanding' : 'Welcome'}
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg } }}
    >
      {pendingCap ? (
        <RootStack.Screen name="SharedCapLanding" initialParams={{ capId: pendingCap }}>
          {({ navigation, route }) => (
            <SharedCapLanding {...makeNav(navigation)} capId={(route.params as any)?.capId} />
          )}
        </RootStack.Screen>
      ) : null}
      <RootStack.Screen name="Welcome">
        {({ navigation }) => <WelcomeScreen {...makeNav(navigation)} />}
      </RootStack.Screen>
      <RootStack.Screen name="Login">
        {({ navigation }) => <LoginScreen {...makeNav(navigation)} onLogin={() => {}} />}
      </RootStack.Screen>
      <RootStack.Screen name="Signup">
        {({ navigation }) => (
          <SignupScreen {...makeNav(navigation)} onSignup={() => navigation.navigate('Login' as never)} />
        )}
      </RootStack.Screen>
    </RootStack.Navigator>
  );
}

function AppStack() {
  const signOut = useAuthStore((s) => s.signOut);
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg } }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen name="Create" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}>
        {({ navigation, route }) => <CreateCapsuleScreen {...makeNav(navigation)} initialType={(route.params as any)?.type} />}
      </RootStack.Screen>
      <RootStack.Screen name="MyCapsules">
        {({ navigation }) => <MyCapsulesScreen {...makeNav(navigation)} onLogout={signOut} />}
      </RootStack.Screen>
      <RootStack.Screen name="AccountSettings">
        {({ navigation }) => <AccountSettingsScreen {...makeNav(navigation)} onLogout={signOut} />}
      </RootStack.Screen>
      <RootStack.Screen name="FriendProfile">
        {({ navigation, route }) => (
          <FriendProfileScreen {...makeNav(navigation)} friend={(route.params as any)?.friend} />
        )}
      </RootStack.Screen>
      <RootStack.Screen name="Friends">
        {({ navigation }) => <FriendsScreen {...makeNav(navigation)} />}
      </RootStack.Screen>
      <RootStack.Screen name="Achievements">
        {({ navigation }) => <AchievementsScreen {...makeNav(navigation)} />}
      </RootStack.Screen>
      <RootStack.Screen name="Search">
        {({ navigation }) => <SearchScreen {...makeNav(navigation)} />}
      </RootStack.Screen>
      <RootStack.Screen name="Drafts">
        {({ navigation }) => <DraftsScreen {...makeNav(navigation)} />}
      </RootStack.Screen>
      <RootStack.Screen name="Messages">
        {({ navigation }) => <MessagesScreen {...makeNav(navigation)} />}
      </RootStack.Screen>
      <RootStack.Screen name="Chat">
        {({ navigation, route }) => (
          <ChatScreen
            {...makeNav(navigation)}
            otherUserId={(route.params as any)?.otherUserId}
            conversationId={(route.params as any)?.conversationId}
            title={(route.params as any)?.title}
          />
        )}
      </RootStack.Screen>
      <RootStack.Screen name="Cap">
        {({ navigation, route }) => (
          <CapScreen capId={(route.params as any)?.capId} {...makeNav(navigation)} />
        )}
      </RootStack.Screen>
      <RootStack.Screen name="TrailStops">
        {({ navigation, route }) => (
          <TrailStopsScreen
            capsuleId={(route.params as any)?.capsuleId}
            trailTitle={(route.params as any)?.trailTitle}
            {...makeNav(navigation)}
          />
        )}
      </RootStack.Screen>
    </RootStack.Navigator>
  );
}

// Deep links (voorcap://cap/<id>, https://voorcap.com/cap/<id>, exp://…/--/cap/<id>)
// are handled MANUALLY via this ref rather than React Navigation's `linking`
// prop: the Cap route lives in the authed AppStack, so a cold-start link would
// otherwise race auth resolution and be dropped. We capture the cap id and
// navigate once auth + navigation are both ready — which also makes the link
// survive a login.
const navigationRef = createNavigationContainerRef();

function capIdFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/cap\/([0-9a-fA-F-]{8,})/);
  return m ? m[1] : null;
}

// React Navigation's built-in linking handles the WARM case (app running). The
// manual handler below is the safety net for COLD starts, where the Cap route
// (authed AppStack only) isn't mounted yet when the URL first resolves.
const linking = {
  prefixes: [Linking.createURL('/'), 'voorcap://', 'https://voorcap.com'],
  config: { screens: { Cap: 'cap/:capId' } },
};

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.bg,
    card: COLORS.bg2,
    text: COLORS.text,
    border: COLORS.border,
    primary: COLORS.ember,
    notification: COLORS.ember,
  },
};

export default function App() {
  const { user, refreshSession } = useAuthStore();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [needLang, setNeedLang] = useState<boolean | null>(null);
  const [pendingCap, setPendingCap] = useState<string | null>(null);
  const [navReady, setNavReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    refreshSession();
    useLanguage.getState().init();
  }, []);

  // Capture incoming cap deep links (initial URL + while running).
  useEffect(() => {
    Linking.getInitialURL()
      .then((u) => { const id = capIdFromUrl(u); if (id) setPendingCap(id); })
      .catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => {
      const id = capIdFromUrl(url);
      if (id) setPendingCap(id);
    });
    return () => sub.remove();
  }, []);

  // Once authenticated and the navigator is ready, open the pending cap.
  useEffect(() => {
    if (
      pendingCap && user && navReady && navigationRef.isReady() &&
      navigationRef.getCurrentRoute()?.name !== 'Cap' // built-in linking may have already handled it
    ) {
      (navigationRef.navigate as any)('Cap', { capId: pendingCap });
      setPendingCap(null);
    }
  }, [pendingCap, user, navReady]);

  // Logged-OUT cold/warm start with a shared-cap link: show the branded landing.
  // `initialRouteName` alone can't cover this — getInitialURL resolves after the
  // first render, so navigate imperatively once the screen is registered.
  // pendingCap is NOT cleared here, so it still opens the cap after auth (effect above).
  useEffect(() => {
    if (
      pendingCap && !user && navReady && navigationRef.isReady() &&
      navigationRef.getCurrentRoute()?.name !== 'SharedCapLanding'
    ) {
      try { (navigationRef.navigate as any)('SharedCapLanding', { capId: pendingCap }); } catch { /* screen not ready yet */ }
    }
  }, [pendingCap, user, navReady]);

  useEffect(() => {
    AsyncStorage.getItem('@timecapsule_onboarded')
      .then((v) => setShowOnboarding(v === null))
      .catch(() => setShowOnboarding(false));
  }, []);

  useEffect(() => {
    // Show the language picker on first launch (before onboarding) until the
    // user has explicitly chosen a language.
    AsyncStorage.getItem('@voorcap_lang')
      .then((v) => setNeedLang(v === null))
      .catch(() => setNeedLang(false));
  }, []);

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('@timecapsule_onboarded', 'true');
    } catch {
      // ignore
    }
    setShowOnboarding(false);
  };

  // Gate only on fonts + onboarding state — never block the whole app on the
  // network-dependent auth `loading` flag (a slow/stale session check would
  // otherwise hang on a spinner forever). Once ready, render AuthStack until a
  // session resolves a user, then AppStack.
  if (!fontsLoaded || showOnboarding === null || needLang === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.ember} />
      </View>
    );
  }

  if (needLang) {
    return (
      <SafeAreaProvider>
        <LanguageSelectScreen onDone={() => setNeedLang(false)} />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking} onReady={() => setNavReady(true)}>
        {user ? <AppStack /> : <AuthStack pendingCap={pendingCap} />}
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
