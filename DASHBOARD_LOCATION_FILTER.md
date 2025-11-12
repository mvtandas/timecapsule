# 📍 Dashboard Location Filter - Complete Guide

## Overview
The Dashboard "Recents" section now shows real capsule data filtered by proximity, displaying only capsules within a 4km radius of the user's current location.

---

## 🎯 Key Features

### 1. **Real-Time Location Tracking** 📍
- Requests location permission on load
- Gets user's actual GPS coordinates
- Falls back to default location if denied
- Updates location on each capsule reload

### 2. **4km Radius Filter** 🎯
- Only shows capsules within 4 kilometers
- Filters out capsules without valid coordinates
- Calculates distance using Haversine formula
- Sorts capsules by distance (nearest first)

### 3. **Real Database Data** 🗃️
- Fetches from `capsules` table via `CapsuleService`
- Shows public capsules
- Shows private capsules user owns or has access to
- Displays real media, titles, descriptions

### 4. **Recent Tab Sorting** ⏰
- **Recent Tab**: Newest capsules first (by created_at)
- **Top Tab**: Most viewed capsules first (by view_count)

---

## 📊 How It Works

### Data Flow

```
User Opens Dashboard
       │
       ▼
Request Location Permission
       │
       ▼
Get Current GPS Coordinates
       │
       ▼
Fetch All Accessible Capsules
       │
       ▼
Filter: Only capsules with lat/lng
       │
       ▼
Calculate Distance for Each Capsule
       │
       ▼
Filter: Only within 4km radius
       │
       ▼
Sort: Nearest First
       │
       ▼
Display on Map + Recents Grid
```

---

## 🔧 Technical Implementation

### Location Service

```typescript
// Request permission
const { status } = await Location.requestForegroundPermissionsAsync();

// Get current position
const location = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.Balanced,
});

// Update state
setUserLocation({
  latitude: location.coords.latitude,
  longitude: location.coords.longitude,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
});
```

---

### Distance Calculation (Haversine Formula)

```typescript
const calculateDistance = (lat1, lon1, lat2, lon2): number => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};
```

---

### Filtering Logic

```typescript
const RADIUS_KM = 4;

const capsulesWithDistance = (data || [])
  .filter(capsule => {
    // Must have valid coordinates
    return capsule.lat && capsule.lng;
  })
  .map(capsule => {
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      capsule.lat,
      capsule.lng
    );
    return { ...capsule, distance };
  })
  .filter(capsule => capsule.distance <= RADIUS_KM)
  .sort((a, b) => a.distance - b.distance);
```

---

## 📱 UI Changes

### Before
```
Recents Tab:
- Showed all capsules (no filter)
- Used fake/generated coordinates
- No distance information
- Only public capsules
```

### After
```
Recents Tab:
- Shows only capsules within 4km ✅
- Uses real GPS coordinates ✅
- Distance calculated and stored ✅
- Public + accessible private capsules ✅
- Sorted by distance (nearest first) ✅
```

---

## 🎨 User Experience

### Loading State
```
┌─────────────────────────────┐
│  Dashboard                  │
│  ┌────────────────────────┐ │
│  │   🔄 Loading...        │ │
│  └────────────────────────┘ │
└─────────────────────────────┘
```

### With Capsules
```
┌─────────────────────────────┐
│  Dashboard                  │
│  ┌────────────────────────┐ │
│  │ 📦 My First Capsule    │ │
│  │ 📍 0.5 km              │ │
│  ├────────────────────────┤ │
│  │ 📦 Beach Memory        │ │
│  │ 📍 1.2 km              │ │
│  ├────────────────────────┤ │
│  │ 📦 Secret Place        │ │
│  │ 📍 3.8 km              │ │
│  └────────────────────────┘ │
└─────────────────────────────┘
```

### Empty State
```
┌─────────────────────────────┐
│  Dashboard                  │
│  ┌────────────────────────┐ │
│  │   📂                   │ │
│  │   No capsules within   │ │
│  │   4km                  │ │
│  │                        │ │
│  │   Create a capsule     │ │
│  │   nearby or explore    │ │
│  │   further!             │ │
│  └────────────────────────┘ │
└─────────────────────────────┘
```

---

## 📊 Console Logs

### Successful Load
```
📍 User location: 40.9887 29.0241
⚠️ Capsule missing coordinates: abc-123-def
📍 Capsule outside 4km radius: "Beach Memory" 5.23 km
📦 Loaded 3 capsules within 4km radius
```

### Location Denied
```
⚠️ Could not get location, using default: [Error: ...]
📦 Loaded 0 capsules within 4km radius
```

---

## 🎯 Capsule Access Rules

The system shows:

| Capsule Type | Visibility |
|--------------|-----------|
| **Public** | ✅ All users can see |
| **Private (Own)** | ✅ Owner can see |
| **Private (Shared)** | ✅ Shared users can see |
| **Private (Not shared)** | ❌ Others cannot see |

**Note:** `CapsuleService.getAllAccessibleCapsules()` already handles these rules via RLS policies.

---

## 🧪 Testing

### Test Scenario 1: Normal Use
1. Open Dashboard
2. Grant location permission
3. ✅ See nearby capsules (within 4km)
4. ✅ Capsules sorted by distance
5. ✅ Distance displayed on each capsule

### Test Scenario 2: No Permission
1. Open Dashboard
2. Deny location permission
3. ✅ Uses default location (Istanbul)
4. ✅ Shows capsules near default location

### Test Scenario 3: No Nearby Capsules
1. Open Dashboard in remote area
2. ✅ Empty state message displayed
3. ✅ "No capsules within 4km"

### Test Scenario 4: Create New Capsule
1. Create capsule with location
2. Reload Dashboard
3. ✅ New capsule appears if within 4km

---

## 🔒 Security & Privacy

### Location Permission
- ✅ Requests permission explicitly
- ✅ Explains why location is needed
- ✅ Falls back gracefully if denied
- ✅ Only uses location for filtering

### Data Access
- ✅ RLS policies enforce access control
- ✅ Users only see capsules they have rights to
- ✅ Private capsules protected
- ✅ No sensitive location data exposed

---

## ⚡ Performance

### Optimizations
1. **Single Location Request**: Gets location once per load
2. **Distance Pre-calculation**: Calculates distance during filtering
3. **Efficient Filtering**: Filters before sorting
4. **Sorted by Distance**: No recalculation needed for display

### Network Calls
- **1 Location API call**: `getCurrentPositionAsync()`
- **1 Database query**: `getAllAccessibleCapsules()`
- **0 Additional queries**: All data fetched at once

---

## 📐 Distance Formula

**Haversine Formula** (great-circle distance):

```
a = sin²(Δφ/2) + cos φ1 ⋅ cos φ2 ⋅ sin²(Δλ/2)
c = 2 ⋅ atan2(√a, √(1−a))
d = R ⋅ c
```

Where:
- φ = latitude (in radians)
- λ = longitude (in radians)
- R = Earth's radius (6371 km)
- d = distance (in km)

**Accuracy:** ±0.5% for distances up to a few hundred km

---

## 🔄 Refresh Behavior

### Pull to Refresh
```typescript
onRefresh={() => {
  loadCapsules(); // Reloads location + capsules
}}
```

### Auto Refresh
- Location checked on each load
- Capsules fetched fresh
- No caching (always up-to-date)

---

## 🎛️ Configuration

### Radius Setting
Change the radius in `DashboardScreen.tsx`:

```typescript
const RADIUS_KM = 4; // Change this value
```

**Suggested values:**
- 1 km - Very local
- 4 km - Default (neighborhood)
- 10 km - City-wide
- 50 km - Regional

### Location Accuracy
```typescript
Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.Balanced, // or High, Low
});
```

---

## 🐛 Troubleshooting

### Issue: No capsules showing
**Check:**
1. Location permission granted?
2. Capsules have valid lat/lng?
3. Any capsules within 4km?
4. User has access to capsules?

**Solution:**
```
Console logs will show:
⚠️ Capsule missing coordinates: [id]
📍 Capsule outside 4km radius: [title] [distance] km
```

### Issue: Wrong location
**Check:**
1. GPS signal available?
2. Location services enabled?
3. App has permission?

**Solution:**
- Try outdoors for better GPS
- Check device location settings
- Reinstall app if needed

### Issue: Distance seems wrong
**Check:**
1. Capsule coordinates correct?
2. User location updated?

**Solution:**
- Pull to refresh
- Verify coordinates in database

---

## ✅ Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Location Tracking | ✅ | Real-time GPS |
| 4km Filter | ✅ | Radius-based filtering |
| Real Data | ✅ | From database |
| Distance Calculation | ✅ | Haversine formula |
| Sorting | ✅ | Nearest first |
| Public Capsules | ✅ | All visible |
| Private Capsules | ✅ | Own + shared |
| Empty State | ✅ | Helpful message |
| Performance | ✅ | Optimized |

---

**Status:** ✅ Production Ready  
**Version:** 1.0  
**Created:** 2025-11-10  
**Last Updated:** 2025-11-10

---

## 📚 Related Files

- `src/screens/dashboard/DashboardScreen.tsx` - Main implementation
- `src/services/capsuleService.ts` - Data fetching
- Database RLS policies - Access control

---

**Ready to use! Grant location permission and see nearby capsules!** 🚀

