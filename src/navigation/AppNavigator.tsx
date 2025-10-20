import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/authStore';
import { MaterialIcons } from '@expo/vector-icons';

// Auth Screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';

// Main Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import CreateCapsuleScreen from '../screens/capsules/CreateCapsuleScreen';
import ExploreScreen from '../screens/explore/ExploreScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Detail Screens
import CapsuleDetailsScreen from '../screens/capsules/CapsuleDetailsScreen';
import CapsulePreviewScreen from '../screens/capsules/CapsulePreviewScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = 'inventory-2';
          } else if (route.name === 'Create') {
            iconName = 'add-box';
          } else if (route.name === 'Explore') {
            iconName = 'location-on';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          } else {
            iconName = 'help';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FAC638',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#f8f8f5',
          borderTopColor: '#e5e7eb',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Create" component={CreateCapsuleScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
      }} 
      initialRouteName="Welcome"
    >
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeScreen}
      />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;