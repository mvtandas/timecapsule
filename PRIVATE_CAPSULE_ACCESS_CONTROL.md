# Private Capsule Access Control System

## Overview
Complete implementation of private capsule sharing with notifications, distance-based unlocking, and visual indicators.

## Features Implemented

### 1. Notification System ✅

**Database Table** (`012_add_notifications.sql`):
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  type TEXT CHECK (type IN ('private_capsule', 'friend_request', 'capsule_unlocked', 'system')),
  sender_id UUID REFERENCES profiles(id),
  receiver_id UUID NOT NULL REFERENCES profiles(id),
  capsule_id UUID REFERENCES capsules(id),
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**NotificationService** (`src/services/notificationService.ts`):
- `notifyPrivateCapsuleShared()` - Send notifications when sharing private capsule
- `getUserNotifications()` - Get user's notifications
- `getUnreadCount()` - Count unread notifications
- `markAsRead()` / `markAllAsRead()` - Mark notifications as read
- `subscribeToNotifications()` - Real-time subscription

**Trigger in CreateCapsuleScreen**:
```typescript
// After creating private capsule
if (!capsuleData.isPublic && sharedWithUsers.length > 0 && data) {
  await NotificationService.notifyPrivateCapsuleShared(
    user.id,
    sharedWithUsers,
    data.id,
    user.user_metadata?.username || 'Someone'
  );
}
```

### 2. Map Marker Icons

**Icon Logic**:
```typescript
// In DashboardScreen marker rendering
const isPrivate = !capsule.is_public;
const isSharedWithUser = capsule.shared_with?.includes(currentUser.id);

const markerIcon = isPrivate 
  ? (isSharedWithUser ? 'lock-open' : 'lock-closed')
  : 'globe';

const markerColor = isPrivate
  ? (isSharedWithUser ? '#FFA726' : '#FF6B6B')  // Orange if shared, red if not
  : '#FAC638'; // Yellow for public
```

**Visual States**:
- 🌍 **Public capsule**: Globe icon, yellow
- 🔓 **Private + Shared with you**: Unlocked icon, orange
- 🔒 **Private + Not shared**: Locked icon, red, very low opacity

### 3. Distance-Based Unlock (1km Radius)

**Check Logic**:
```typescript
const handleCapsuleTap = (capsule) => {
  // 1. Check if private
  if (!capsule.is_public) {
    // 2. Check if shared with user
    if (!capsule.shared_with?.includes(currentUser.id)) {
      Alert.alert(
        '🔒 Not Shared',
        'This capsule isn\'t shared with you.'
      );
      return;
    }
    
    // 3. Check distance (1km for private, already have 4km visibility check)
    const distanceStatus = getDistanceStatus(userCoords, capsuleCoords);
    
    if (!distanceStatus.withinOpenRadius) { // 1km
      Alert.alert(
        '📍 Too Far',
        `Get within ${OPEN_RADIUS_KM}km to unlock this private capsule.`
      );
      return;
    }
  }
  
  // All checks passed - open capsule
  openCapsuleDetail(capsule);
};
```

**Combined Checks**:
1. **Public capsules**: 1km unlock radius
2. **Private capsules (shared)**: 1km unlock radius + must be in `shared_with`
3. **Private capsules (not shared)**: Cannot open at all

### 4. Visibility Restrictions

**RLS Policy Update**:
```sql
-- Allow reading capsules if:
-- 1. Public
-- 2. Owned by user
-- 3. Shared with user (in shared_with array)
CREATE POLICY "Enable read access for all users"
ON capsules FOR SELECT
USING (
  is_public = TRUE OR
  owner_id = auth.uid() OR
  auth.uid() = ANY(shared_with)
);
```

**UI Restrictions**:
- Map: Show all capsules but with different icons
- List: Only show accessible capsules
- Detail: Show warning if not accessible or too far

### 5. Blur and Lock UI

**Map Markers**:
```typescript
// Distant or inaccessible capsules
<Marker
  opacity={!isAccessible ? 0.3 : (isPrivate ? 0.7 : 1.0)}
  style={[
    styles.marker,
    !isAccessible && styles.markerLocked
  ]}
>
  {!isAccessible && (
    <View style={styles.lockOverlay}>
      <Ionicons name="lock-closed" size={16} color="#fff" />
    </View>
  )}
</Marker>
```

**Capsule Detail**:
```typescript
{/* Blur media if not accessible */}
{capsule.media_url && (
  <View>
    <Image 
      source={{ uri: capsule.media_url }}
      style={[
        styles.media,
        !isAccessible && styles.mediaBlurred
      ]}
    />
    {!isAccessible && (
      <BlurView intensity={90} style={styles.blurOverlay}>
        <Ionicons name="lock-closed" size={64} color="white" />
        <Text style={styles.blurText}>
          {!isSharedWithUser 
            ? 'Not shared with you'
            : `Get within ${OPEN_RADIUS_KM}km to unlock`
          }
        </Text>
      </BlurView>
    )}
  </View>
)}
```

### 6. User Messages

**Not Shared**:
```
🔒 Not Shared With You
This private capsule hasn't been shared with you.
```

**Too Far (Shared)**:
```
📍 Get Within 1KM
You're 2.3km away. Get closer to unlock this private capsule.
```

**Nearby (Shared)**:
```
🔓 Shared With You
Get within 1km to open this capsule.
```

**Can Open**:
```
✅ Tap to Open
This private capsule is unlocked for you.
```

## Security Implementation

### Server-Side (RLS Policies)

**Capsules Table**:
```sql
-- SELECT: Only accessible capsules
CREATE POLICY "Enable read access for all users"
ON capsules FOR SELECT
USING (
  is_public = TRUE OR
  owner_id = auth.uid() OR
  auth.uid() = ANY(shared_with)
);

-- INSERT: User can create and share
CREATE POLICY "Allow authenticated users to create capsules"
ON capsules FOR INSERT
WITH CHECK (
  owner_id = auth.uid() AND
  (is_public = TRUE OR (is_public = FALSE AND shared_with IS NOT NULL))
);

-- UPDATE: Only owner
CREATE POLICY "Allow owners to update their capsules"
ON capsules FOR UPDATE
USING (owner_id = auth.uid());

-- DELETE: Only owner
CREATE POLICY "Allow owners to delete their capsules"
ON capsules FOR DELETE
USING (owner_id = auth.uid());
```

**Notifications Table**:
```sql
-- SELECT: Only receiver can read
CREATE POLICY "Users can read their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = receiver_id);

-- INSERT: Only sender can create
CREATE POLICY "Users can send notifications"
ON notifications FOR INSERT
WITH CHECK (auth.uid() = sender_id OR sender_id IS NULL);

-- UPDATE: Only receiver can update (mark read)
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = receiver_id);

-- DELETE: Only receiver can delete
CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
USING (auth.uid() = receiver_id);
```

### Client-Side Validation

**Double-Check Access**:
```typescript
const canAccessCapsule = (capsule: Capsule, userId: string): boolean => {
  if (capsule.is_public) return true;
  if (capsule.owner_id === userId) return true;
  if (capsule.shared_with?.includes(userId)) return true;
  return false;
};

const canUnlockCapsule = (
  capsule: Capsule, 
  userId: string,
  userLocation: Coordinates
): { canUnlock: boolean; reason: string } => {
  if (!canAccessCapsule(capsule, userId)) {
    return { canUnlock: false, reason: 'Not shared with you' };
  }
  
  const distance = getDistanceInKm(
    userLocation.latitude,
    userLocation.longitude,
    capsule.lat,
    capsule.lng
  );
  
  if (distance > OPEN_RADIUS_KM) {
    return { 
      canUnlock: false, 
      reason: `Too far (${formatDistance(distance)})` 
    };
  }
  
  return { canUnlock: true, reason: '' };
};
```

## Usage Flow

### 1. Creating Private Capsule
```typescript
// User creates capsule
// Step 3: Select "Private"
// Step 3: Search and select friends to share with
// Step 5: Save capsule

// Backend:
// 1. Capsule created with is_public=false, shared_with=[userId1, userId2]
// 2. Notifications sent to all users in shared_with array
// 3. Users receive notification: "John shared a private capsule with you"
```

### 2. Viewing Private Capsule on Map
```typescript
// All users see marker on map
// Icon changes based on access:
//   - Public: Globe (yellow)
//   - Private + Shared: Unlock (orange)
//   - Private + Not Shared: Lock (red, faded)
```

### 3. Attempting to Open
```typescript
// User taps marker
// System checks:
//   1. Is it shared with user? → If no, show "Not shared"
//   2. Is user within 1km? → If no, show "Too far"
//   3. Both passed → Open capsule detail
```

### 4. Capsule Detail View
```typescript
// If accessible:
//   - Show full content
//   - Show media
//   - Allow interactions

// If not accessible:
//   - Blur media
//   - Show lock overlay
//   - Display reason (not shared or too far)
```

## Testing Checklist

### Notifications
- [ ] Create private capsule shared with Friend A
- [ ] Friend A receives notification
- [ ] Notification shows sender's name and message
- [ ] Can mark notification as read
- [ ] Can view associated capsule from notification

### Map Icons
- [ ] Public capsules show globe icon (yellow)
- [ ] Private capsules shared with you show unlock icon (orange)
- [ ] Private capsules not shared show lock icon (red, faded)
- [ ] Icons change based on user context

### Access Control
- [ ] Cannot open private capsule if not shared
- [ ] Cannot open private capsule if > 1km away
- [ ] Can open private capsule if shared + within 1km
- [ ] Public capsules follow existing 1km rule

### Blur & Lock UI
- [ ] Non-shared private capsules show blur on media
- [ ] Distant private capsules show blur with distance message
- [ ] Lock icon overlay appears correctly
- [ ] Messages are clear and actionable

### Security
- [ ] RLS policies prevent unauthorized database access
- [ ] Cannot query private capsules not shared with you
- [ ] Cannot modify other users' capsules
- [ ] Media URLs are protected

## API Endpoints (Optional)

For additional server-side validation:

```typescript
// POST /api/capsules/{id}/check-access
// Validates if user can access capsule
{
  userId: string,
  userLat: number,
  userLng: number
}

// Response:
{
  canAccess: boolean,
  canUnlock: boolean,
  reason: string,
  distance: number
}
```

## Related Files
- `db/migrations/012_add_notifications.sql`
- `src/services/notificationService.ts`
- `src/screens/capsules/CreateCapsuleScreen.tsx`
- `src/screens/dashboard/DashboardScreen.tsx`
- `src/screens/capsules/CapsuleDetailsScreen.tsx`
- `src/utils/distance.ts` (already implemented)

## Future Enhancements

1. **Push Notifications**: Real device notifications via FCM/APNs
2. **Notification Center**: Dedicated screen for viewing all notifications
3. **Capsule Unlocked Notifications**: Notify when shared capsule unlocks
4. **Group Sharing**: Share with multiple friends at once with group selector
5. **Proximity Alerts**: Notify when near a shared private capsule
6. **Share History**: Track who viewed/opened shared capsules

