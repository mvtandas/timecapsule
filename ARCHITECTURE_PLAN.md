# Time Capsule React Native Application - Architecture Plan

## 📋 Project Overview

Time Capsule is a React Native application that allows users to create digital time capsules containing memories, messages, and content linked to specific times and locations. Users can lock capsules to time or location and open them when conditions are met.

## 🏗️ Technology Stack

- **Frontend**: React Native (Expo) with TypeScript
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Supabase (Auth, Database, Storage)
- **State Management**: Zustand
- **Navigation**: React Navigation (Stack Navigator)
- **Location Services**: expo-location + react-native-maps
- **Media Handling**: expo-image-picker, expo-av
- **Notifications**: Expo Notifications
- **Encryption**: crypto-js (placeholder)

## 📁 Project Structure

```
time-capsule/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Generic components
│   │   ├── forms/           # Form components
│   │   └── maps/            # Map-related components
│   ├── screens/             # Screen components
│   │   ├── auth/            # Authentication screens
│   │   ├── capsules/        # Capsule-related screens
│   │   ├── dashboard/       # Dashboard screens
│   │   ├── explore/         # Map/explore screens
│   │   └── profile/         # Profile/settings screens
│   ├── navigation/          # Navigation configuration
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility libraries
│   │   ├── supabase.ts      # Supabase client
│   │   ├── storage.ts       # Storage utilities
│   │   └── encryption.ts    # Encryption utilities
│   ├── store/               # Zustand stores
│   ├── styles/              # Global styles and themes
│   ├── types/               # TypeScript type definitions
│   └── assets/              # Images, fonts, etc.
├── db/
│   └── migrations/          # Supabase migration files
├── examples/                # HTML design references
└── __tests__/               # Test files
```

## 🗄️ Database Schema

### Profiles Table
```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);
```

### Capsules Table
```sql
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
```

### Capsule Contents Table
```sql
create table capsule_contents (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid references capsules(id) on delete cascade,
  content_type text, -- 'image', 'video', 'audio', 'text'
  file_url text,
  metadata jsonb,
  created_at timestamptz default now()
);
```

## 🎨 Design System

### Color Palette
- **Primary**: #FAC638 (Yellow/Gold)
- **Background Light**: #f8f8f5
- **Background Dark**: #231e0f
- **Text Light**: #111827
- **Text Dark**: #F9FAFB

### Typography
- **Font Family**: Plus Jakarta Sans
- **Weights**: 400, 500, 700, 800

### Component Patterns
- **Cards**: Rounded corners (0.5rem default, 1rem lg, 1.5rem xl)
- **Buttons**: Full-width primary buttons with shadow
- **Inputs**: Rounded with focus rings
- **Icons**: Material Symbols Outlined

## 🔄 Screen Flow

### Authentication Flow
1. Welcome/Onboarding (3 screens)
2. Login/Signup with Supabase Auth

### Main App Flow
1. Dashboard (My Capsules)
2. Create Capsule (5-step flow)
3. Explore/Map View
4. Profile/Settings

### Capsule Interaction Flow
1. View Capsule Details
2. Preview Capsule
3. Open Capsule (when conditions met)

## 🔧 Key Features Implementation

### Authentication
- Email magic link authentication via Supabase
- Profile management
- Session persistence

### Capsule Creation
- Multi-step form (5 screens)
- Media upload (images, videos, audio)
- Time/Location locking
- Privacy settings

### Location Services
- Current location detection
- Map integration with react-native-maps
- Geofencing for location-based capsules

### Media Handling
- Image picker integration
- Video recording
- Audio recording
- Supabase Storage integration

### Time-based Opening
- Countdown timers
- Scheduled notifications
- Automatic unlocking

### Notifications
- Push notifications for capsule availability
- In-app notifications
- Email notifications (optional)

## 🧩 Component Architecture

### Reusable Components
- `CapsuleCard` - Display capsule in lists
- `MediaUpload` - Handle media uploads
- `LocationPicker` - Location selection
- `DateTimePicker` - Date/time selection
- `PrivacyToggle` - Privacy settings
- `BottomNavigation` - Main navigation

### Screen Components
- Each screen will be a separate component
- Screens will use reusable components
- Consistent header/footer patterns
- Responsive design considerations

## 📱 Navigation Structure

### Stack Navigators
- **Auth Stack**: Login, Signup, Onboarding
- **Main Stack**: Dashboard, Create, Explore, Profile
- **Capsule Stack**: Details, Preview, Content View

### Tab Navigation
- Bottom tab navigation for main sections
- Active state indicators
- Icon-based navigation

## 🔐 Security Considerations

### Data Protection
- Content encryption before storage
- Secure file uploads
- User permission checks

### Privacy
- Private capsules by default
- User-controlled sharing
- Location privacy options

## 🚀 Performance Optimizations

### Image Handling
- Image compression
- Lazy loading
- Caching strategies

### Data Management
- Efficient queries
- Pagination for large lists
- Local caching with Zustand

### Bundle Size
- Code splitting
- Dynamic imports
- Asset optimization

## 📋 Testing Strategy

### Unit Tests
- Component testing
- Hook testing
- Utility function testing

### Integration Tests
- API integration
- Navigation flow
- User interactions

### E2E Tests
- Critical user journeys
- Cross-platform testing

## 🔄 Development Workflow

### Phase 1: Foundation
1. Project setup
2. Supabase integration
3. Authentication system
4. Basic navigation

### Phase 2: Core Features
1. Capsule creation flow
2. Dashboard implementation
3. Basic media handling

### Phase 3: Advanced Features
1. Location services
2. Map integration
3. Notifications
4. Advanced media features

### Phase 4: Polish
1. UI/UX refinements
2. Performance optimization
3. Testing
4. Documentation

## 📝 Notes

- All screens will reference their HTML counterparts in examples/
- NativeWind will be used for styling to match HTML designs
- Material Symbols icons will be used consistently
- Dark mode support throughout the application
- Responsive design for different screen sizes
- Accessibility considerations (screen readers, etc.)