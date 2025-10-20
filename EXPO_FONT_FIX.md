# Expo Font Module Issue - Specific Fix

## Problem
The expo-font module is causing a resolution error even though it's properly listed in package.json. This is a known issue with certain Expo versions.

## Root Cause
This error typically occurs when:
1. Node modules are corrupted
2. Expo CLI version conflicts
3. Metro bundler cache issues
4. Platform-specific font loading issues

## Step-by-Step Fix

### Step 1: Complete Cleanup
```bash
# Remove all node_modules and lock files
rm -rf node_modules
rm -f package-lock.json
rm -f yarn.lock

# Clear all caches
npm cache clean --force
npx expo start --clear --non-interactive &
sleep 3
pkill -f "expo start"

# Clear Expo cache specifically
npx expo r -c
```

### Step 2: Update Expo CLI
```bash
# Update to latest Expo CLI
npm install -g @expo/cli@latest

# Verify Expo CLI version
expo --version
```

### Step 3: Reinstall with Specific Versions
```bash
# Install specific versions that are known to work
npm install expo-font@11.4.0 expo@49.0.15

# Or use yarn
yarn add expo-font@11.4.0 expo@49.0.15
```

### Step 4: Alternative Approach - Skip Font Loading
If the font issue persists, you can temporarily skip font loading in App.tsx:

```typescript
// Comment out or remove font loading
// import { useFonts } from 'expo-font';

export default function App() {
  // const [fontsLoaded] = useFonts({
  //   SpaceGrotesk: require('./assets/fonts/SpaceGrotesk-Regular.ttf'),
  // });

  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}
```

### Step 5: Use Expo Prebuild
```bash
# Use prebuild instead of start for better module resolution
npx expo prebuild --clear
```

### Step 6: Reset Metro Config
```bash
# Reset Metro config to defaults
npx expo config --reset

# Start fresh
npx expo start --clear
```

## Verification
After applying these fixes, verify the application starts without the font error:

```bash
# Should start without expo-font errors
npm start
```

## If Issue Persists

If the expo-font issue continues, you may need to:

1. **Downgrade Expo CLI**: Use a specific version known to work
2. **Use Different Font Library**: Switch to `@expo-google-fonts` or similar
3. **Custom Font Loading**: Implement your own font loading solution
4. **Contact Expo Support**: This may be a bug in the specific Expo version

## Prevention

To prevent this issue in the future:

1. **Lock dependency versions**: Use exact versions in package.json
2. **Regular updates**: Keep dependencies updated regularly
3. **Test after changes**: Verify app starts after each dependency change
4. **Use npm ci**: For automated deployments, use `npm ci` for consistent installs