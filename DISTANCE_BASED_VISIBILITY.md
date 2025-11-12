# Distance-Based Visibility & Access Restrictions

## Overview
This feature implements distance-based restrictions for capsule visibility and access. Users can only fully interact with capsules that are within a certain proximity, encouraging real-world exploration and treasure-hunting gameplay.

## Distance Thresholds

### 🌍 Visibility Radius: 4km
- Capsules within 4km are **visible** with full details
- Capsules beyond 4km are **blurred** and partially hidden
- Map markers show reduced opacity for distant capsules

### 📍 Opening Radius: 1km
- Capsules within 1km can be **opened** and fully accessed
- Capsules between 1-4km are visible but cannot be opened yet
- Requires users to physically approach the capsule location

## Implementation

### 1. Distance Utility Service (`src/utils/distance.ts`)

```typescript
// Key functions:
getDistanceInKm(lat1, lon1, lat2, lon2) // Haversine formula
isWithinViewRadius(userCoords, capsuleCoords) // Check 4km radius
isWithinOpenRadius(userCoords, capsuleCoords) // Check 1km radius
getDistanceStatus(userCoords, capsuleCoords) // Complete status object
formatDistance(distanceKm) // User-friendly formatting
hasMovedSignificantly(oldCoords, newCoords, threshold) // For optimization
```

### 2. Map Markers (DashboardScreen)

**Visual States:**
- **Full Opacity (1.0)**: Within 1km - can open
- **Reduced Opacity (0.6)**: 1-4km - visible but can't open
- **Very Low Opacity (0.3)**: Beyond 4km - blurred/distant

**Marker Colors:**
- **Yellow border**: Normal openable state
- **Orange border**: Nearby but not openable (1-4km)
- **Gray border**: Distant/locked (>4km)

**Lock Icon Overlay:**
- Small lock icon appears on markers beyond 4km

### 3. Capsule Grid/List (DashboardScreen)

**Blur Effects:**
- Images are blurred (opacity 0.5) for capsules beyond 4km
- BlurView overlay with lock icon and distance text
- Distance badge colors:
  - **Green**: Within 1km (can open)
  - **Dark**: 1-4km (nearby)
  - **Gray**: Beyond 4km (distant)

### 4. Tap Behavior

**When user taps a capsule:**

#### Beyond 4km (Not Visible):
```
Alert: 🌍 Too Far Away
"You're too far (X.Xkm away). Get closer to reveal this capsule."
```

#### 1-4km (Visible but Can't Open):
```
Alert: 📍 Get Closer
"You're nearby, but need to be within 1km to open this capsule."
```

#### Within 1km (Can Open):
- Full interaction enabled
- Opens capsule detail modal
- Increments view count

### 5. Capsule Details Screen

**Distance Warning Banner:**
- Appears at top of detail screen when capsule is not within opening radius
- **Orange Banner**: 1-4km away - "Get Closer to Open"
- **Red Banner**: Beyond 4km - "Too Far Away"
- Shows distance in km/m and helpful message

## Performance Optimizations

### 1. Threshold-Based Updates
```typescript
// Only recalculate when user moves >100m
hasMovedSignificantly(oldCoords, newCoords, 100)
```

### 2. Avoid Excessive Calculations
- Distance calculated once per capsule per render
- Cached in component state when possible
- Uses stable coordinates to prevent re-renders

### 3. Location Permissions
- Request location permission on app start
- Gracefully handle permission denial
- Use balanced accuracy (not high precision) for battery efficiency

## User Experience

### Visual Feedback
1. **Map View**:
   - Distant capsules appear faded and grayed out
   - Lock icons clearly indicate inaccessible capsules
   - Distance shown in callouts

2. **Grid View**:
   - Blurred images with lock overlay for distant capsules
   - Color-coded distance badges
   - Clear visual hierarchy

3. **Detail View**:
   - Prominent warning banner when too far
   - Real-time distance display
   - Encouraging messages to explore

### Messages & Copy
- **Encouraging**: "Get closer to reveal..." not "Access denied"
- **Specific**: Shows exact distance remaining
- **Actionable**: Tells users what they need to do

## Testing Checklist

### ✅ Map Markers
- [ ] Markers within 1km show full opacity and yellow border
- [ ] Markers 1-4km show reduced opacity and orange border
- [ ] Markers beyond 4km show low opacity, gray border, and lock icon
- [ ] Callout text changes based on distance

### ✅ Grid/List View
- [ ] Images blur correctly for distant capsules
- [ ] BlurView overlay shows lock icon and distance
- [ ] Distance badges change color appropriately
- [ ] Tap behavior shows correct alerts

### ✅ Interaction Behavior
- [ ] Tapping distant capsule (>4km) shows "Too Far Away" alert
- [ ] Tapping nearby capsule (1-4km) shows "Get Closer" alert
- [ ] Tapping close capsule (<1km) opens detail modal
- [ ] Alerts have appropriate icons and messaging

### ✅ Detail Screen
- [ ] Distance banner appears when appropriate
- [ ] Banner color changes: orange (1-4km), red (>4km)
- [ ] Distance updates if user moves
- [ ] Banner disappears when within opening radius

### ✅ Performance
- [ ] No lag when scrolling map with many capsules
- [ ] Location updates don't cause excessive re-renders
- [ ] Battery usage remains reasonable

## Development Notes

### Adding New Distance-Based Features

1. **Import distance utilities**:
```typescript
import { 
  getDistanceStatus, 
  formatDistance, 
  VISIBILITY_RADIUS_KM,
  OPEN_RADIUS_KM,
  type Coordinates 
} from '../../utils/distance';
```

2. **Get user location**:
```typescript
const location = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.Balanced,
});
const userCoords: Coordinates = {
  latitude: location.coords.latitude,
  longitude: location.coords.longitude,
};
```

3. **Calculate distance status**:
```typescript
const capsuleCoords = { lat: capsule.lat, lng: capsule.lng };
const distanceStatus = getDistanceStatus(userCoords, capsuleCoords);

// Use the status
if (!distanceStatus.withinOpenRadius) {
  Alert.alert('Too Far', distanceStatus.message);
  return;
}
```

### Customizing Thresholds

Edit `src/utils/distance.ts`:
```typescript
export const VISIBILITY_RADIUS_KM = 4; // Change to 5, 10, etc.
export const OPEN_RADIUS_KM = 1; // Change to 0.5, 2, etc.
```

### Future Enhancements

1. **Progressive Blur**: Gradually increase blur as distance increases
2. **Distance Leaderboards**: Reward users who travel far
3. **Proximity Notifications**: Alert when approaching hidden capsules
4. **AR Mode**: Use camera + AR for very close capsules (<100m)
5. **Group Unlock**: Allow friends to collectively unlock distant capsules

## Security Considerations

### Client-Side Validation
Current implementation validates distance on the client. While this provides good UX, it can be spoofed.

### Recommended Server-Side Validation
For production, add server-side distance validation:

```typescript
// Backend endpoint
POST /api/capsules/{id}/open
Body: { userLat, userLng }

// Validate on server
const distance = calculateDistance(userLat, userLng, capsule.lat, capsule.lng);
if (distance > OPEN_RADIUS_KM) {
  return { error: 'Too far away' };
}
```

## Troubleshooting

### Location Permission Issues
- **iOS**: Add `NSLocationWhenInUseUsageDescription` to Info.plist
- **Android**: Add permissions to AndroidManifest.xml
- Test with physical device (simulators may have issues)

### Distance Calculations Off
- Ensure lat/lng are in decimal degrees (not radians)
- Check that coordinates are valid (-90 to 90 lat, -180 to 180 lng)
- Haversine formula assumes spherical Earth (minor inaccuracy for very long distances)

### Performance Issues
- Reduce calculation frequency with `hasMovedSignificantly`
- Consider pagination/clustering for large numbers of capsules
- Profile with React DevTools to find bottlenecks

## Related Files
- `src/utils/distance.ts` - Distance calculation utilities
- `src/screens/dashboard/DashboardScreen.tsx` - Map markers and grid view
- `src/screens/capsules/CapsuleDetailsScreen.tsx` - Detail screen with distance banner

