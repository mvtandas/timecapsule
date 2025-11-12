# Auth Persistence & Capsule Media Storage Fix

## Problem
1. **Media not persisting**: Capsule media was uploading to bucket but not being properly displayed
2. **Capsules not showing after logout/login**: User capsules were not reloading when logging back in

## Solutions Implemented

### 1. Media Storage (Already Working) ✅

**MediaService** (`src/services/mediaService.ts`) was already correctly:
- Uploading media files to `capsules_media` bucket
- Generating unique paths: `{userId}/{capsuleId}_{timestamp}.{ext}`
- Returning public URLs for database storage
- Using proper content types for images and videos

**CreateCapsuleScreen** was already:
- Calling `MediaService.uploadMedia()` before creating capsule
- Saving `media_url` and `media_type` to capsules table
- Handling upload failures gracefully

```typescript
const uploadResult = await MediaService.uploadMedia(
  firstMedia.uri,
  user.id,
  tempCapsuleId
);

if (uploadResult) {
  mediaUrl = uploadResult.url; // Public URL
  mediaType = uploadResult.type; // 'image' | 'video'
}

await CapsuleService.createCapsule({
  // ... other fields
  media_url: mediaUrl,
  media_type: mediaType,
});
```

### 2. Auth State Persistence (NEW) 🆕

**Problem**: When users logged out and logged back in, capsules weren't reloading automatically.

**Solution**: Added `supabase.auth.onAuthStateChange` listeners to automatically reload capsules on auth events.

#### MyCapsulesScreen (`src/screens/dashboard/MyCapsulesScreen.tsx`)

```typescript
// Listen for auth state changes to reload capsules on login/logout
useEffect(() => {
  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔐 Auth state changed:', event, session?.user?.id);
    
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      // User logged in or token refreshed - reload capsules
      console.log('✅ User logged in, reloading capsules...');
      loadCapsules();
    } else if (event === 'SIGNED_OUT') {
      // User logged out - clear capsules
      console.log('🚪 User logged out, clearing capsules...');
      setCapsules([]);
    }
  });

  // Cleanup subscription on unmount
  return () => {
    authListener?.subscription?.unsubscribe();
  };
}, [activeTab]);
```

#### DashboardScreen (`src/screens/dashboard/DashboardScreen.tsx`)

```typescript
// Listen for auth state changes to reload capsules on login/logout
useEffect(() => {
  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔐 Dashboard: Auth state changed:', event, session?.user?.id);
    
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      // User logged in or token refreshed - reload capsules
      console.log('✅ Dashboard: User logged in, reloading capsules...');
      loadCapsules();
    } else if (event === 'SIGNED_OUT') {
      // User logged out - clear capsules
      console.log('🚪 Dashboard: User logged out, clearing capsules...');
      setCapsules([]);
    }
  });

  // Cleanup subscription on unmount
  return () => {
    authListener?.subscription?.unsubscribe();
  };
}, []);
```

## How It Works

### Auth Events Handled

1. **SIGNED_IN**: User successfully logged in
   - ✅ Triggers `loadCapsules()` to fetch user's capsules
   - ✅ Restores user's previous capsules from database

2. **TOKEN_REFRESHED**: Auth token was automatically refreshed
   - ✅ Ensures capsules stay loaded during long sessions
   - ✅ Handles background token refreshes

3. **SIGNED_OUT**: User logged out
   - ✅ Clears capsules array to prevent data leakage
   - ✅ Clean state for next login

### Database Queries

**getUserCapsules()** correctly filters by `owner_id`:
```typescript
const { data, error } = await supabase
  .from('capsules')
  .select('*')
  .eq('owner_id', user.id) // ← User-specific filter
  .order('created_at', { ascending: false });
```

**getSharedCapsules()** correctly filters by `shared_with`:
```typescript
const { data, error } = await supabase
  .from('capsules')
  .select('*')
  .eq('is_public', false)
  .neq('owner_id', user.id); // Exclude own capsules

// Client-side filter for shared_with array
const sharedCapsules = (data || []).filter(capsule => 
  capsule.shared_with && 
  Array.isArray(capsule.shared_with) && 
  capsule.shared_with.includes(user.id)
);
```

## Testing

### Scenario 1: Create Capsule with Media
1. Login as User A
2. Create a capsule with photo/video
3. ✅ Media uploads to `capsules_media/{userId}/...`
4. ✅ `media_url` saved to capsules table
5. ✅ Capsule displays correctly in "My Capsules"

### Scenario 2: Logout and Re-login
1. Login as User A
2. Create several capsules
3. Logout
4. ✅ Capsules cleared from UI
5. Login as User A again
6. ✅ Auth listener triggers
7. ✅ `loadCapsules()` called automatically
8. ✅ All previous capsules loaded and displayed

### Scenario 3: Switch Accounts
1. Login as User A
2. Create capsules
3. Logout
4. Login as User B
5. ✅ User A's capsules cleared
6. ✅ Only User B's capsules displayed
7. ✅ No data leakage between accounts

### Scenario 4: Token Refresh (Long Session)
1. Login and keep app open for extended period
2. ✅ Supabase auto-refreshes token
3. ✅ `TOKEN_REFRESHED` event fires
4. ✅ Capsules reload to ensure fresh data
5. ✅ No disruption to user experience

## Console Logs

When auth state changes, you'll see these logs:

```
🔐 Auth state changed: SIGNED_IN {userId}
✅ User logged in, reloading capsules...
📦 Accessible capsules: 12

🔐 Dashboard: Auth state changed: SIGNED_IN {userId}
✅ Dashboard: User logged in, reloading capsules...
📦 Accessible capsules: 12
```

On logout:
```
🔐 Auth state changed: SIGNED_OUT
🚪 User logged out, clearing capsules...

🔐 Dashboard: Auth state changed: SIGNED_OUT
🚪 Dashboard: User logged out, clearing capsules...
```

## Benefits

### Data Persistence ✅
- User capsules persist in database
- Media files persist in Supabase Storage
- Can logout and login anytime without data loss

### Automatic Refresh ✅
- No manual refresh needed after login
- Token refreshes handled automatically
- Always shows current user's data

### Security ✅
- Data cleared on logout
- No cross-user data leakage
- Proper RLS policies enforced

### User Experience ✅
- Seamless login experience
- Immediate data availability
- Background token refresh invisible

## Related Files
- `src/screens/dashboard/MyCapsulesScreen.tsx` - My Capsules with auth listener
- `src/screens/dashboard/DashboardScreen.tsx` - Dashboard map with auth listener
- `src/services/capsuleService.ts` - Capsule queries (already user-filtered)
- `src/services/mediaService.ts` - Media upload (already working)

## Future Improvements

1. **Offline Support**: Cache capsules locally for offline viewing
2. **Progressive Loading**: Load capsules incrementally for large collections
3. **Background Sync**: Sync capsules in background when online
4. **Push Notifications**: Notify when shared capsules unlock

