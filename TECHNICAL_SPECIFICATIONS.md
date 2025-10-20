# Time Capsule - Technical Specifications

## 📦 Dependencies and Setup

### Required Packages

```bash
# Core Expo and React Native
npx expo init time-capsule --template expo-template-blank-typescript

# Navigation
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# Styling
npm install nativewind && npm install --dev tailwindcss
npm install react-native-svg

# Backend and Storage
npm install @supabase/supabase-js
npm install expo-image-picker expo-av expo-file-system

# Location and Maps
npm install expo-location react-native-maps
npm install react-native-maps-directions

# State Management
npm install zustand

# Utilities
npm install crypto-js
npm install @react-native-async-storage/async-storage
npm install expo-linear-gradient

# Notifications
npm install expo-notifications expo-device

# Date/Time
npm install @react-native-community/datetimepicker

# Development
npm install --dev @types/crypto-js
```

### Configuration Files

#### app.json
```json
{
  "expo": {
    "name": "Time Capsule",
    "slug": "time-capsule",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#f8f8f5"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.timecapsule.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#f8f8f5"
      },
      "package": "com.timecapsule.app"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-location",
      "expo-notifications",
      [
        "expo-image-picker",
        {
          "photosPermission": "The app accesses your photos to let you add them to your time capsules."
        }
      ]
    ]
  }
}
```

#### tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#FAC638',
        'primary-light': '#A7F3D0',
        'primary-dark': '#047857',
        'background-light': '#f8f8f5',
        'background-dark': '#231e0f',
        'text-light': '#111827',
        'text-dark': '#F9FAFB',
        'accent-light': '#FFD166',
        'accent-dark': '#06D6A0',
      },
      fontFamily: {
        'display': ['PlusJakartaSans_400Regular', 'PlusJakartaSans_500Medium', 'PlusJakartaSans_700Bold', 'PlusJakartaSans_800ExtraBold'],
      },
      borderRadius: {
        'DEFAULT': '0.5rem',
        'lg': '1rem',
        'xl': '1.5rem',
        'full': '9999px',
      },
      boxShadow: {
        'soft': '0 4px 15px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
```

#### babel.config.js
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ["nativewind/babel"],
  };
};
```

#### metro.config.js
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for SVG files
config.resolver.assetExts.push(
  // Adds support for additional file types
  'svg'
);

module.exports = config;
```

## 🗄️ Supabase Setup

### Environment Variables (.env)
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Schema (db/migrations/001_init.sql)
```sql
-- Profiles table
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Capsules table
create table capsules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id),
  title text,
  description text,
  content_refs jsonb,
  open_at timestamptz,
  lat double precision,
  lng double precision,
  is_public boolean default false,
  allowed_users jsonb,
  blockchain_hash text,
  created_at timestamptz default now()
);

-- Capsule contents table
create table capsule_contents (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid references capsules(id) on delete cascade,
  content_type text check (content_type in ('image', 'video', 'audio', 'text')),
  file_url text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Shared capsules table
create table shared_capsules (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid references capsules(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  permission text check (permission in ('view', 'edit')),
  created_at timestamptz default now()
);

-- Create indexes
create index capsules_owner_id_idx on capsules(owner_id);
create index capsules_open_at_idx on capsules(open_at);
create index capsules_location_idx on capsules(lat, lng);
create index capsule_contents_capsule_id_idx on capsule_contents(capsule_id);
create index shared_capsules_capsule_id_idx on shared_capsules(capsule_id);
create index shared_capsules_user_id_idx on shared_capsules(user_id);

-- Row Level Security
alter table profiles enable row level security;
alter table capsules enable row level security;
alter table capsule_contents enable row level security;
alter table shared_capsules enable row level security;

-- Profiles RLS policies
create policy "Users can view own profile."
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile."
  on profiles for update using (auth.uid() = id);

-- Capsules RLS policies
create policy "Users can view own capsules."
  on capsules for select using (auth.uid() = owner_id);

create policy "Users can view public capsules."
  on capsules for select using (is_public = true);

create policy "Users can view shared capsules."
  on capsules for select using (
    id in (
      select capsule_id from shared_capsules where user_id = auth.uid()
    )
  );

create policy "Users can insert own capsules."
  on capsules for insert with check (auth.uid() = owner_id);

create policy "Users can update own capsules."
  on capsules for update using (auth.uid() = owner_id);

create policy "Users can delete own capsules."
  on capsules for delete using (auth.uid() = owner_id);

-- Capsule contents RLS policies
create policy "Users can view contents of accessible capsules."
  on capsule_contents for select using (
    capsule_id in (
      select id from capsules where 
        owner_id = auth.uid() or 
        is_public = true or
        id in (
          select capsule_id from shared_capsules where user_id = auth.uid()
        )
    )
  );

create policy "Users can insert contents for own capsules."
  on capsule_contents for insert with check (
    capsule_id in (
      select id from capsules where owner_id = auth.uid()
    )
  );

-- Shared capsules RLS policies
create policy "Users can view shared capsules."
  on shared_capsules for select using (auth.uid() = user_id);

create policy "Users can insert shared capsules."
  on shared_capsules for insert with check (auth.uid() = user_id);

create policy "Users can delete shared capsules."
  on shared_capsules for delete using (auth.uid() = user_id);
```

## 🔧 Supabase Client Configuration

### lib/supabase.ts
```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

## 📱 TypeScript Types

### types/index.ts
```typescript
export interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Capsule {
  id: string;
  owner_id: string;
  title: string;
  description?: string;
  content_refs: string[];
  open_at?: string;
  lat?: number;
  lng?: number;
  is_public: boolean;
  allowed_users: string[];
  blockchain_hash?: string;
  created_at: string;
  updated_at?: string;
}

export interface CapsuleContent {
  id: string;
  capsule_id: string;
  content_type: 'image' | 'video' | 'audio' | 'text';
  file_url: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface SharedCapsule {
  id: string;
  capsule_id: string;
  user_id: string;
  permission: 'view' | 'edit';
  created_at: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface MediaFile {
  uri: string;
  type: string;
  name: string;
  size?: number;
}

export interface CreateCapsuleData {
  title: string;
  description?: string;
  open_at?: string;
  lat?: number;
  lng?: number;
  is_public: boolean;
  allowed_users: string[];
  contents: Omit<CapsuleContent, 'id' | 'capsule_id' | 'created_at'>[];
}

export interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
}

export interface CapsulesState {
  capsules: Capsule[];
  loading: boolean;
  error: string | null;
  selectedCapsule: Capsule | null;
}

export interface UIState {
  theme: 'light' | 'dark';
  activeTab: string;
  networkStatus: 'online' | 'offline';
}
```

## 🏪 Zustand Stores

### store/authStore.ts
```typescript
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { AuthState, User } from '../types';
import { Session } from '@supabase/supabase-js';

interface AuthStore extends AuthState {
  signIn: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ error: any }>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  loading: true,

  signIn: async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: 'timecapsule://auth/callback',
        },
      });
      return { error };
    } catch (error) {
      return { error };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  refreshSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, loading: false });
  },

  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return { error: 'No user logged in' };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error) {
      set({ user: { ...user, ...updates } });
    }

    return { error };
  },
}));
```

### store/capsulesStore.ts
```typescript
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { CapsulesState, Capsule, CreateCapsuleData } from '../types';

interface CapsulesStore extends CapsulesState {
  fetchCapsules: () => Promise<void>;
  createCapsule: (data: CreateCapsuleData) => Promise<{ error: any; data: Capsule | null }>;
  updateCapsule: (id: string, updates: Partial<Capsule>) => Promise<{ error: any }>;
  deleteCapsule: (id: string) => Promise<{ error: any }>;
  setSelectedCapsule: (capsule: Capsule | null) => void;
}

export const useCapsulesStore = create<CapsulesStore>((set, get) => ({
  capsules: [],
  loading: false,
  error: null,
  selectedCapsule: null,

  fetchCapsules: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('capsules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ capsules: data || [], loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  createCapsule: async (data) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: capsule, error } = await supabase
        .from('capsules')
        .insert({
          ...data,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        capsules: [capsule, ...state.capsules],
      }));

      return { error: null, data: capsule };
    } catch (error) {
      return { error, data: null };
    }
  },

  updateCapsule: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('capsules')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        capsules: state.capsules.map(capsule =>
          capsule.id === id ? { ...capsule, ...updates } : capsule
        ),
      }));

      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  deleteCapsule: async (id) => {
    try {
      const { error } = await supabase
        .from('capsules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        capsules: state.capsules.filter(capsule => capsule.id !== id),
      }));

      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  setSelectedCapsule: (capsule) => {
    set({ selectedCapsule: capsule });
  },
}));
```

## 🎨 Component Structure

### components/common/Button.tsx
```typescript
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    };

    const sizeStyles = {
      small: { paddingHorizontal: 12, paddingVertical: 8 },
      medium: { paddingHorizontal: 16, paddingVertical: 12 },
      large: { paddingHorizontal: 24, paddingVertical: 16 },
    };

    const variantStyles = {
      primary: {
        backgroundColor: '#FAC638',
      },
      secondary: {
        backgroundColor: '#f3f4f6',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#FAC638',
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...style,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: '600',
    };

    const sizeStyles = {
      small: { fontSize: 14 },
      medium: { fontSize: 16 },
      large: { fontSize: 18 },
    };

    const variantStyles = {
      primary: {
        color: '#000000',
      },
      secondary: {
        color: '#000000',
      },
      outline: {
        color: '#FAC638',
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...textStyle,
    };
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#FAC638' : '#000000'} />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};
```

## 🗺️ Navigation Structure

### navigation/AppNavigator.tsx
```typescript
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
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Create" component={CreateCapsuleScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const { user } = useAuthStore();

  return (
    <NavigationContainer>
      {user ? <MainTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;
```

## 📱 Permissions Setup

### app.json (Additional permissions)
```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow Time Capsule to use your location to create location-based time capsules."
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#FAC638",
          "sounds": [
            "./assets/notification-sound.wav"
          ]
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "The app accesses your photos to let you add them to your time capsules.",
          "cameraPermission": "The app accesses your camera to let you add photos to your time capsules."
        }
      ]
    ]
  }
}
```

## 🚀 Development Commands

### package.json scripts
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build:android": "expo build:android",
    "build:ios": "expo build:ios",
    "test": "jest",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "type-check": "tsc --noEmit"
  }
}
```

This technical specification provides all the necessary configurations, types, and boilerplate code to start building the Time Capsule application with React Native, Expo, and Supabase.