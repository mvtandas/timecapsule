# Private Capsule Sharing - Profile & Map Display Fix

## Problem
Private capsules shared with users were not appearing in:
1. Friend profile pages (neither in map view nor in "Shared with me" section)
2. Dashboard map view

## Root Cause
The app was using an old `shared_capsules` table that doesn't exist. The new implementation uses the `shared_with` column (UUID array) in the `capsules` table.

## Changes Made

### 1. Updated `CapsuleService` (src/services/capsuleService.ts)

#### `getAllAccessibleCapsules()` - For Dashboard/Map
```typescript
// Now fetches ALL capsules and relies on RLS policy to filter:
// - Owned by user (owner_id = auth.uid())
// - Public (is_public = true)
// - Shared with user (auth.uid() = ANY(shared_with))

const { data, error } = await supabase
  .from('capsules')
  .select('*')
  .order('created_at', { ascending: false });
```

#### `getAccessibleCapsulesForUser(userId)` - NEW Function for Friend Profiles
```typescript
// Fetches capsules created by a specific user that current user can see:
// - Public capsules by this user
// - Private capsules where current user is in shared_with array

const { data, error } = await supabase
  .from('capsules')
  .select('*')
  .eq('owner_id', userId)
  .order('created_at', { ascending: false });
```

#### `getSharedCapsules()` - For "Shared with me" Tab
```typescript
// Now uses shared_with array instead of shared_capsules table
const { data, error } = await supabase
  .from('capsules')
  .select('*')
  .eq('is_public', false)
  .neq('owner_id', user.id); // Exclude user's own capsules

// Client-side filter to ensure user is in shared_with array
const sharedCapsules = (data || []).filter(capsule => 
  capsule.shared_with && 
  Array.isArray(capsule.shared_with) && 
  capsule.shared_with.includes(user.id)
);
```

### 2. Updated `FriendProfileScreen` (src/screens/friends/FriendProfileScreen.tsx)

**Before:**
- Fetched public capsules manually
- Tried to fetch from non-existent `shared_capsules` table

**After:**
```typescript
// Single call to get all accessible capsules (public + shared)
const { data: accessibleData, error } = await CapsuleService.getAccessibleCapsulesForUser(viewedProfileId);

// Separate into public and shared lists
(accessibleData || []).forEach((capsule) => {
  if (capsule.is_public) {
    publicList.push(capsuleSummary);
  } else {
    // Private capsule shared with current user
    sharedList.push({ ...capsuleSummary, shared_at: capsule.created_at });
  }
});
```

### 3. RLS Policy (Already in db/migrations/011_add_shared_with.sql)

```sql
-- Allow users to read capsules that are:
-- 1. Public
-- 2. Owned by them
-- 3. Shared with them (via shared_with array)
CREATE POLICY "Enable read access for all users"
ON capsules FOR SELECT
USING (
  is_public = TRUE OR
  owner_id = auth.uid() OR
  auth.uid() = ANY(shared_with)
);
```

## How It Works Now

### Creating a Private Capsule with Sharing
1. User creates capsule and selects "Private"
2. User searches and selects friends to share with
3. Capsule is created with `shared_with: [userId1, userId2, userId3]`

### Viewing Shared Capsules

#### On Dashboard Map
- `getAllAccessibleCapsules()` fetches all capsules
- RLS automatically filters to show:
  - User's own capsules
  - Public capsules
  - Private capsules shared with user
- All appear on the map

#### On Friend Profile Page
- When viewing a friend's profile
- `getAccessibleCapsulesForUser(friendId)` fetches:
  - Friend's public capsules
  - Friend's private capsules shared with current user
- Displayed in:
  - Map view on profile
  - "Public Capsules" section
  - "Shared with me" section

#### On "My Capsules" - Shared Tab
- `getSharedCapsules()` fetches only:
  - Private capsules where current user is in `shared_with` array
  - Excludes user's own capsules

## Testing Checklist

### ✅ Profile Pages
- [ ] Visit a friend's profile who shared a private capsule with you
- [ ] Verify capsule appears on the map
- [ ] Verify capsule appears in "Shared with me" section

### ✅ Dashboard Map
- [ ] Create a private capsule and share with a friend
- [ ] Login as that friend
- [ ] Verify capsule appears on the dashboard map

### ✅ My Capsules - Shared Tab
- [ ] Have someone share a private capsule with you
- [ ] Go to My Capsules > Shared tab
- [ ] Verify the shared capsule appears in the list

### ✅ Capsule Details
- [ ] Open a shared private capsule
- [ ] Verify "Shared With" section shows correct usernames and avatars

## Notes

- All filtering is done server-side via RLS policies for security
- Client-side filtering in `getSharedCapsules()` is an extra safety layer
- The `shared_with` column is a PostgreSQL UUID array type
- No need for a separate `shared_capsules` junction table

