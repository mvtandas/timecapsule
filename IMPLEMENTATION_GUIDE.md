# Time Capsule - Implementation Guide

## 🎯 HTML to React Native Conversion Strategy

### Conversion Rules

| HTML Element | React Native Equivalent | Notes |
|---------------|------------------------|-------|
| `<div>` | `<View>` | Use flexbox for layout |
| `<img>` | `<Image>` | Use `source={{uri: 'url'}}` |
| `<button>` | `<TouchableOpacity>` | Add proper styling |
| `<input>` | `<TextInput>` | Handle onChangeText |
| `<textarea>` | `<TextInput multiline>` | Set multiline prop |
| `<a>` | `<TouchableOpacity>` with navigation | Use navigation.navigate |
| `<span>` | `<Text>` | For inline text |
| `<p>` | `<Text>` | For paragraph text |
| `<h1-h6>` | `<Text>` with appropriate styles | Use fontSize and fontWeight |

### CSS to NativeWind Conversion

| CSS Property | NativeWind Equivalent | Example |
|--------------|----------------------|---------|
| `display: flex` | `flex` | `className="flex"` |
| `flex-direction: row` | `flex-row` | `className="flex-row"` |
| `justify-content: center` | `justify-center` | `className="justify-center"` |
| `align-items: center` | `items-center` | `className="items-center"` |
| `background-color: #FAC638` | `bg-primary` | `className="bg-primary"` |
| `border-radius: 0.5rem` | `rounded-lg` | `className="rounded-lg"` |
| `padding: 1rem` | `p-4` | `className="p-4"` |
| `margin: 1rem` | `m-4` | `className="m-4"` |

## 📱 Screen-by-Screen Implementation Plan

### 1. Welcome/Onboarding Screens

#### Welcome Screen 1 (`examples/welcome_and_onboarding_1/code.html`)
- **Key Elements**: Hero image, title, description, CTA buttons, bottom navigation
- **Components Needed**:
  - `HeroImage` - Background image with gradient overlay
  - `WelcomeButtons` - Get Started and Login buttons
  - `BottomNav` - Navigation tab bar
- **Implementation Notes**:
  - Use `ImageBackground` for hero section
  - Implement gradient overlay with `LinearGradient` from expo-linear-gradient
  - Bottom navigation should be hidden on auth screens

#### Welcome Screen 2 (`examples/welcome_and_onboarding_2/code.html`)
- **Key Elements**: Centered icon, title, description, pagination dots, CTA button
- **Components Needed**:
  - `OnboardingIcon` - Animated icon
  - `PaginationDots` - Page indicators
  - `OnboardingButton` - Primary CTA button
- **Implementation Notes**:
  - Use `Animated.View` for icon animation
  - Implement dot indicators for pagination

#### Welcome Screen 3 (`examples/welcome_and_onboarding_3/code.html`)
- **Key Elements**: Large icon, app title, description, CTA button, theme toggle
- **Components Needed**:
  - `AppLogo` - Large animated icon
  - `ThemeToggle` - Dark/light mode switcher
  - `GetStartedButton` - Primary CTA with shadow
- **Implementation Notes**:
  - Implement theme switching with Zustand store
  - Use shadow props for button elevation

### 2. My Capsules Dashboard

#### Dashboard Screen 1 (`examples/my_capsules_dashboard_1/code.html`)
- **Key Elements**: Header with title, tab navigation, capsule list, bottom nav
- **Components Needed**:
  - `DashboardHeader` - Title and add button
  - `TabNavigation` - Created/Shared tabs
  - `CapsuleList` - List of capsule cards
  - `CapsuleCard` - Individual capsule item
- **Implementation Notes**:
  - Implement pull-to-refresh functionality
  - Use `FlatList` for efficient rendering
  - Add empty state when no capsules

#### Dashboard Screen 2 (`examples/my_capsules_dashboard_2/code.html`)
- **Key Elements**: Filter options, sorted capsule list
- **Components Needed**:
  - `FilterOptions` - Filter by date, type, etc.
  - `SortOptions` - Sort by name, date, etc.
- **Implementation Notes**:
  - Implement filtering logic in Zustand store
  - Add search functionality

#### Dashboard Screen 3 (`examples/my_capsules_dashboard_3/code.html`)
- **Key Elements**: Grid view, capsule statistics
- **Components Needed**:
  - `CapsuleGrid` - Grid layout for capsules
  - `StatsCard` - Display capsule statistics
- **Implementation Notes**:
  - Implement view toggle (list/grid)
  - Add analytics dashboard

### 3. Create New Capsule Flow

#### Create Screen 1 (`examples/create_new_capsule_1/code.html`)
- **Key Elements**: Back button, capsule type selection, name/description inputs
- **Components Needed**:
  - `CapsuleTypeSelector` - Grid of capsule types
  - `FormInput` - Text input for name
  - `FormTextarea` - Textarea for description
- **Implementation Notes**:
  - Implement capsule type selection with state
  - Add form validation

#### Create Screen 2 (`examples/create_new_capsule_2/code.html`)
- **Key Elements**: Content upload area, date picker, location input, privacy toggle
- **Components Needed**:
  - `MediaUploadArea` - Drag and drop for media
  - `DatePicker` - Date/time selection
  - `LocationInput` - Location selection
  - `PrivacyToggle` - Private/Shared/Public
- **Implementation Notes**:
  - Implement media picker integration
  - Add location services integration
  - Use expo-date-time-picker

#### Create Screen 3 (`examples/create_new_capsule_3/code.html`)
- **Key Elements**: Recipient selection, sharing options
- **Components Needed**:
  - `UserSelector` - Select users to share with
  - `ShareOptions` - Sharing settings
- **Implementation Notes**:
  - Implement user search functionality
  - Add contact integration

#### Create Screen 4 (`examples/create_new_capsule_4/code.html`)
- **Key Elements**: Preview of capsule, settings confirmation
- **Components Needed**:
  - `CapsulePreview` - Preview of created capsule
  - `SettingsSummary` - Display all settings
- **Implementation Notes**:
  - Implement preview generation
  - Add edit functionality

#### Create Screen 5 (`examples/create_new_capsule_5/code.html`)
- **Key Elements**: Success message, sharing options
- **Components Needed**:
  - `SuccessMessage` - Creation confirmation
  - `ShareActions` - Share capsule options
- **Implementation Notes**:
  - Implement success animation
  - Add social sharing integration

### 4. Capsule Details View

#### Details Screen 1 (`examples/capsule_details_view_1/code.html`)
- **Key Elements**: Header with back button, hero image, content details, share/delete buttons
- **Components Needed**:
  - `CapsuleHeader` - Title and actions
  - `HeroImage` - Large capsule image
  - `ContentDetails` - Capsule information
  - `ActionButtons` - Share and delete
- **Implementation Notes**:
  - Implement image gallery
  - Add content viewer for different media types

#### Details Screen 2 (`examples/capsule_details_view_2/code.html`)
- **Key Elements**: Expanded content view, comments, interactions
- **Components Needed**:
  - `ContentViewer` - Display capsule content
  - `CommentSection` - User comments
  - `InteractionBar` - Like, comment, share
- **Implementation Notes**:
  - Implement media viewer with zoom
  - Add comment functionality

### 5. Capsule Preview Screen

#### Preview Screen (`examples/capsule_preview_screen/code.html`)
- **Key Elements**: Editable title/description, content grid, settings display, action buttons
- **Components Needed**:
  - `EditableFields` - Editable title and description
  - `ContentGrid` - Grid of capsule content
  - `SettingsDisplay` - Show capsule settings
  - `ActionButtons` - Edit and save buttons
- **Implementation Notes**:
  - Implement inline editing
  - Add content management

### 6. Map/Explore Screens

#### Map Screen 1 (`examples/explore/map_view_1/code.html`)
- **Key Elements**: Map view, search bar, zoom controls, location button, floating action button
- **Components Needed**:
  - `MapView` - Interactive map
  - `SearchBar` - Location search
  - `MapControls` - Zoom and location controls
  - `FloatingActionButton` - Add capsule button
- **Implementation Notes**:
  - Use react-native-maps
  - Implement marker clustering
  - Add location tracking

#### Map Screen 2 (`examples/explore/map_view_2/code.html`)
- **Key Elements**: Filtered map view, capsule list overlay
- **Components Needed**:
  - `FilteredMap` - Map with filters
  - `CapsuleOverlay` - List of nearby capsules
- **Implementation Notes**:
  - Implement map filters
  - Add distance-based sorting

### 7. Profile and Settings

#### Profile Screen (`examples/profile_and_settings/code.html`)
- **Key Elements**: Profile header, settings sections, toggle switches, navigation items
- **Components Needed**:
  - `ProfileHeader` - User info and avatar
  - `SettingsSection` - Grouped settings
  - `ToggleItem` - Settings with toggle
  - `NavigationItem` - Settings with navigation
- **Implementation Notes**:
  - Implement profile editing
  - Add settings persistence
  - Include app version and about section

## 🧩 Reusable Components

### Core Components

#### `CapsuleCard`
```typescript
interface CapsuleCardProps {
  capsule: Capsule;
  onPress: (capsule: Capsule) => void;
  showLock?: boolean;
}
```

#### `MediaUpload`
```typescript
interface MediaUploadProps {
  onMediaSelected: (media: MediaFile[]) => void;
  maxFiles?: number;
  allowedTypes?: ('image' | 'video' | 'audio')[];
}
```

#### `LocationPicker`
```typescript
interface LocationPickerProps {
  onLocationSelected: (location: Location) => void;
  initialLocation?: Location;
}
```

#### `DateTimePicker`
```typescript
interface DateTimePickerProps {
  onDateChange: (date: Date) => void;
  initialDate?: Date;
  mode?: 'date' | 'time' | 'datetime';
}
```

### Form Components

#### `FormInput`
```typescript
interface FormInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
}
```

#### `FormTextarea`
```typescript
interface FormTextareaProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  numberOfLines?: number;
}
```

## 🔄 State Management with Zustand

### Auth Store
```typescript
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

### Capsules Store
```typescript
interface CapsulesState {
  capsules: Capsule[];
  loading: boolean;
  error: string | null;
  fetchCapsules: () => Promise<void>;
  createCapsule: (capsule: CreateCapsuleData) => Promise<void>;
  updateCapsule: (id: string, updates: Partial<Capsule>) => Promise<void>;
  deleteCapsule: (id: string) => Promise<void>;
}
```

### UI Store
```typescript
interface UIState {
  theme: 'light' | 'dark';
  activeTab: string;
  setTheme: (theme: 'light' | 'dark') => void;
  setActiveTab: (tab: string) => void;
}
```

## 🔧 Implementation Checklist

### For Each Screen:
- [ ] Convert HTML structure to React Native components
- [ ] Apply NativeWind styling to match design
- [ ] Implement navigation between screens
- [ ] Add state management with Zustand
- [ ] Connect to Supabase for data operations
- [ ] Add loading and error states
- [ ] Implement pull-to-refresh where applicable
- [ ] Add accessibility labels
- [ ] Test on both iOS and Android

### For Each Component:
- [ ] Create TypeScript interfaces for props
- [ ] Implement component logic
- [ ] Add proper styling with NativeWind
- [ ] Add touch feedback
- [ ] Handle edge cases
- [ ] Add unit tests

## 📱 Platform-Specific Considerations

### iOS
- Use safe area insets for proper spacing
- Implement haptic feedback
- Use iOS-style navigation patterns

### Android
- Handle back button properly
- Use Material Design icons
- Implement proper status bar handling

## 🎨 Design System Implementation

### Colors (tailwind.config.js)
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#FAC638',
        'background-light': '#f8f8f5',
        'background-dark': '#231e0f',
        'text-light': '#111827',
        'text-dark': '#F9FAFB',
      }
    }
  }
}
```

### Typography
```javascript
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        'display': ['PlusJakartaSans_400Regular', 'PlusJakartaSans_500Medium', 'PlusJakartaSans_700Bold', 'PlusJakartaSans_800ExtraBold'],
      }
    }
  }
}
```

## 🚀 Next Steps

1. **Start with project setup** - Install dependencies, configure NativeWind
2. **Implement authentication** - Set up Supabase auth, create auth screens
3. **Build core screens** - Start with dashboard and capsule creation
4. **Add advanced features** - Location services, notifications
5. **Polish and optimize** - Performance, testing, documentation

This guide provides a comprehensive roadmap for converting the HTML designs to a fully functional React Native application with all the features specified in the requirements.