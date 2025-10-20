# Time Capsule

A React Native application that allows users to create digital time capsules containing memories, messages, and content linked to specific times and locations.

## 🚀 Features

- 📱 Create and manage digital time capsules
- 🔒 Time-based and location-based capsule locking
- 📸 Media upload (photos, videos, audio)
- 🗺️ Map integration for location-based capsules
- 🔐 Secure authentication with Supabase
- 🎨 Beautiful UI with NativeWind (Tailwind CSS)
- 🌙 Dark mode support
- 📲 Cross-platform (iOS & Android)

## 🛠️ Technology Stack

- **Frontend**: React Native (Expo) with TypeScript
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Supabase (Auth, Database, Storage)
- **State Management**: Zustand
- **Navigation**: React Navigation
- **Location Services**: expo-location + react-native-maps
- **Media Handling**: expo-image-picker, expo-av

## 📋 Prerequisites

- Node.js 16+ installed
- Expo CLI installed (`npm install -g expo-cli`)
- Supabase account and project

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd time-capsule
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Copy the values from your Supabase project settings.

### 4. Set up Supabase database

1. Go to your Supabase project dashboard
2. Navigate to the SQL editor
3. Run the migration script from `db/migrations/001_init.sql`

### 5. Start the development server

If you encounter any dependency issues (especially with expo-font), run the fix script first:

```bash
./fix-dependencies.sh
```

Then start the development server:

```bash
npm start
```

This will start the Expo development server. You can then:

- Scan the QR code with the Expo Go app on your phone
- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator

### 6. Troubleshooting

If you encounter the `expo-font` module error:

```bash
# Quick fix
rm -rf node_modules
npm install
npm start -- --clear
```

Or run the comprehensive fix script:
```bash
./fix-dependencies.sh
```

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more detailed solutions.

## 📁 Project Structure

```
time-capsule/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/             # Screen components
│   │   ├── auth/            # Authentication screens
│   │   ├── capsules/        # Capsule-related screens
│   │   ├── dashboard/       # Dashboard screens
│   │   ├── explore/         # Map/explore screens
│   │   └── profile/         # Profile/settings screens
│   ├── navigation/          # Navigation configuration
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility libraries
│   ├── store/               # Zustand stores
│   ├── styles/              # Global styles and themes
│   ├── types/               # TypeScript type definitions
│   └── assets/              # Images, fonts, etc.
├── db/
│   └── migrations/          # Supabase migration files
├── examples/                # HTML design references
└── __tests__/               # Test files
```

## 🔧 Development Commands

```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web

# Build for production
npm run build:android
npm run build:ios

# Type checking
npm run type-check

# Linting
npm run lint

# Run tests
npm test
```

## 🎨 Design System

### Colors

- **Primary**: #FAC638 (Yellow/Gold)
- **Background Light**: #f8f8f5
- **Background Dark**: #231e0f
- **Text Light**: #111827
- **Text Dark**: #F9FAFB

### Typography

- **Font Family**: Plus Jakarta Sans
- **Weights**: 400, 500, 700, 800

### Components

The app uses a component-based architecture with reusable components in `src/components/`. All components are styled using NativeWind classes that match the original HTML designs.

## 📱 Screens

### Authentication Flow
- Welcome Screen (`examples/welcome_and_onboarding_1/`)
- Login Screen (`examples/welcome_and_onboarding_2/`)

### Main App
- Dashboard (`examples/my_capsules_dashboard_1/`)
- Create Capsule (`examples/create_new_capsule_1/`)
- Explore/Map (`examples/explore/map_view_1/`)
- Profile/Settings (`examples/profile_and_settings/`)

### Capsule Management
- Capsule Details (`examples/capsule_details_view_1/`)
- Capsule Preview (`examples/capsule_preview_screen/`)

## 🔐 Authentication

The app uses Supabase Auth with email magic link authentication. Users can sign in by entering their email address and receive a magic link to authenticate.

## 🗄️ Database Schema

The app uses PostgreSQL with the following main tables:

- `profiles` - User profiles
- `capsules` - Time capsule data
- `capsule_contents` - Media and content for capsules
- `shared_capsules` - Sharing permissions

See `db/migrations/001_init.sql` for the complete schema.

## 📍 Location Services

The app integrates with device location services to:
- Create location-based capsules
- Show nearby capsules on the map
- Enable geofencing for capsule opening

## 📸 Media Upload

Users can upload various media types to their capsules:
- Photos from camera or gallery
- Video recordings
- Audio recordings
- Text messages

All media is stored in Supabase Storage with proper security rules.

## 🔔 Notifications

The app supports push notifications for:
- Capsule availability alerts
- Shared capsule notifications
- Reminders for upcoming capsule openings

## 🧪 Testing

The app includes comprehensive testing:

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📦 Building for Production

### Android

```bash
npm run build:android
```

### iOS

```bash
npm run build:ios
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Original HTML designs from the `examples/` folder
- Supabase for the backend services
- Expo for the React Native framework
- NativeWind for Tailwind CSS support

## 📞 Support

If you have any questions or issues, please open an issue on the GitHub repository.

---

**Note**: This is a prototype application. Some features may be placeholders or require additional implementation for production use.