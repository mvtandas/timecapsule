# Time Capsule - Troubleshooting Guide

## Common Issues and Solutions

### 1. Module Not Found Errors

If you encounter errors like:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/path/to/project/node_modules/expo-font/build/Font'
```

**Solution:**
```bash
# Clean and reinstall dependencies
rm -rf node_modules
rm package-lock.json
npm install

# Or using yarn
rm -rf node_modules
rm yarn.lock
yarn install
```

### 2. Metro Bundler Issues

If the Metro bundler fails to start or has caching issues:

```bash
# Clear Metro cache
npx expo start --clear

# Or completely reset
npx expo start -c
```

### 3. TypeScript Errors

If you encounter TypeScript compilation errors:

```bash
# Check TypeScript configuration
npx tsc --noEmit

# Update TypeScript types
npm install --save-dev @types/react@~18.2.14 @types/react-native@~0.72.2
```

### 4. NativeWind Issues

If NativeWind classes are not working:

1. Ensure you've run the metro config setup:
```bash
npx tailwindcss init
```

2. Check your babel.config.js includes the nativewind plugin:
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ["nativewind/babel"],
  };
};
```

3. Restart the Metro bundler:
```bash
npx expo start --clear
```

### 5. Supabase Connection Issues

If you can't connect to Supabase:

1. Check your .env file:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

2. Ensure the URL and key are correct and have no extra spaces

3. Check your Supabase project is active

### 6. Navigation Issues

If navigation doesn't work:

1. Ensure all screens are properly exported
2. Check navigation imports are correct
3. Verify the navigator structure in AppNavigator.tsx

### 7. Location Permission Issues

If location services don't work:

1. Check app.json has proper permissions:
```json
"plugins": [
  [
    "expo-location",
    {
      "locationAlwaysAndWhenInUsePermission": "Allow Time Capsule to use your location"
    }
  ]
]
```

2. Ensure you've granted permissions on the device

### 8. Notification Issues

If push notifications don't work:

1. Check app.json has notification permissions
2. Ensure you've requested permissions in the app
3. Verify your device allows notifications

## Development Environment Setup

### Prerequisites

1. **Node.js**: Version 16 or higher
2. **Expo CLI**: `npm install -g expo-cli`
3. **Android Studio** (for Android development)
4. **Xcode** (for iOS development, macOS only)

### Environment Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Start development server: `npm start`

### Common Development Commands

```bash
# Start development server
npm start

# Start with cleared cache
npm start -- --clear

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web

# Type checking
npm run type-check

# Linting
npm run lint

# Run tests
npm test
```

## Performance Issues

### Slow Development Server

If the development server is slow:

1. Increase Metro memory:
```bash
node --max-old-space-size=4096 node_modules/.bin/expo start
```

2. Use watchman (macOS):
```bash
brew install watchman
```

### Build Issues

If builds fail:

1. Check Expo CLI version: `expo --version`
2. Update Expo CLI: `npm install -g expo-cli@latest`
3. Clear Expo cache: `expo r -c`

## Platform-Specific Issues

### iOS

1. **Xcode Version**: Ensure you're using a supported Xcode version
2. **Simulator**: Try using a different simulator
3. **iOS Version**: Test on multiple iOS versions

### Android

1. **Android Studio**: Ensure Android Studio is properly configured
2. **Emulator**: Try creating a new emulator
3. **Gradle**: Clear Gradle cache: `cd android && ./gradlew clean`

## Getting Help

If you're still having issues:

1. Check the [Expo documentation](https://docs.expo.dev/)
2. Search [GitHub issues](https://github.com/expo/expo/issues)
3. Ask in the [Expo Discord](https://discord.gg/expo)
4. Create an issue in this repository

## Debugging Tips

1. **Use React DevTools**: Install React DevTools for debugging
2. **Flipper**: Use Flipper for advanced debugging
3. **Console Logs**: Add console.log statements for debugging
4. **Network Inspector**: Use Expo's network inspector for API calls
5. **Performance Monitor**: Use Expo's performance monitor

## Common Error Messages

### "Unable to resolve module"
- Usually a missing dependency or incorrect import
- Try `npm install` or check import paths

### "Metro bundler stopped"
- Usually a syntax error or import issue
- Check the error logs for specific file and line

### "Cannot read property of undefined"
- Usually a state management issue
- Check your Zustand store usage

### "Network request failed"
- Usually a connectivity or API issue
- Check your network connection and API endpoints