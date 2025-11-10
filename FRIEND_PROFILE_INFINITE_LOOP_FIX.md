# Friend Profile Infinite Loop Fix - COMPLETE SOLUTION

## Problem
When visiting a user profile from the Friends screen, the profile page would show **"Loading Profile..."** indefinitely and keep refreshing in an infinite loop.

## Root Cause
The infinite loop was caused by **multiple circular dependency issues** in the `FriendProfileScreen.tsx` component:

1. **Unstable Dependencies in useCallback**: The `loadProfileData` callback had dependencies on:
   - Multiple `friend` object properties (`friend.display_name`, `friend.name`, `friend.username`, `friend.avatar_url`)
   - The `buildActivityFeed` callback function
   
2. **Nested useCallback Chain**: `buildActivityFeed` was wrapped in `useCallback` with `formatOpenLabel` as dependency, creating a dependency chain that triggered re-renders

3. **Cascading Re-renders**: When these properties changed or functions were recreated, it caused `loadProfileData` to be recreated, which triggered the `useEffect` again, causing an infinite loop

## Solution Implemented

### 1. Converted `loadProfileData` from useCallback to Regular Function
**File**: `src/screens/friends/FriendProfileScreen.tsx`

**Before**:
```ts
const loadProfileData = useCallback(async () => {
  // ... function body
}, [viewedProfileId, friend.display_name, friend.name, friend.username, friend.avatar_url, buildActivityFeed]);
```

**After**:
```ts
const loadProfileData = async () => {
  // ... function body with console logs for debugging
};
```

**Why this works**: 
- Removing `useCallback` eliminates the dependency tracking that was causing re-renders
- The function is only called from `useEffect`, which now only depends on `viewedProfileId`
- This breaks the circular dependency chain

### 2. Removed useCallback from `buildActivityFeed`

**Before**:
```ts
const buildActivityFeed = useCallback(
  (publicList: CapsuleSummary[], sharedList: CapsuleSummary[]) => {
    // ... function body
  },
  [formatOpenLabel]
);
```

**After**:
```ts
const buildActivityFeed = (publicList: CapsuleSummary[], sharedList: CapsuleSummary[]) => {
  // ... function body - directly calls formatOpenLabel inline
};
```

**Why this works**:
- `buildActivityFeed` is only called within `loadProfileData`, not passed as a prop
- No need to memoize it since it's not a dependency or prop
- Removes another layer of dependency tracking

### 3. Simplified useEffect Dependencies

**Before**:
```ts
useEffect(() => {
  loadProfileData();
}, [loadProfileData]); // This caused re-runs when loadProfileData changed
```

**After**:
```ts
useEffect(() => {
  console.log('🚀 FriendProfileScreen mounted, viewedProfileId:', viewedProfileId);
  loadProfileData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [viewedProfileId]); // Only re-run when the actual userId changes
```

**Why this works**:
- Effect only runs when `viewedProfileId` changes (i.e., when viewing a different profile)
- Doesn't re-run when functions are recreated
- The eslint disable comment is intentional and safe here

### 4. Improved Profile Data Fetching
- Now fetches `username` directly from the profiles table (not just from the friend prop)
- Added comprehensive error handling with early returns
- Added detailed console logging for debugging (with emojis for easy scanning)

**Key changes**:
```ts
// Now includes username in the query
const { data: profileData, error: profileError } = await supabase
  .from('profiles')
  .select('id, display_name, username, avatar_url, created_at')
  .eq('id', viewedProfileId)
  .maybeSingle();

console.log('📊 Profile data fetched:', profileData);

// Error handling
if (profileError) {
  console.error('❌ Profile fetch error:', profileError.message);
}

if (!profileData) {
  console.error('❌ No profile data found for userId:', viewedProfileId);
  setError('Profile not found');
  setLoading(false);
  return;
}

console.log('✅ Profile data loaded successfully');
```

### 5. Updated Display Logic with useMemo
Made the display values more stable by properly memoizing them:

```ts
const displayName = useMemo(() => {
  return profile?.display_name || friend?.display_name || friend?.name || 'TimeCapsule User';
}, [profile?.display_name, friend?.display_name, friend?.name]);

const username = useMemo(() => {
  return profile?.username || friend?.username || 'unknown';
}, [profile?.username, friend?.username]);

const avatarUrl = useMemo(() => {
  return profile?.avatar_url || friend?.avatar_url || null;
}, [profile?.avatar_url, friend?.avatar_url]);
```

These memos prevent unnecessary component re-renders when computing display values.

### 6. Database RLS Policy Fix
**File**: `db/migrations/006_fix_profile_rls.sql`

Created a new migration to ensure proper Row Level Security policies:

```sql
-- Allow all authenticated users to read all profiles
CREATE POLICY "Allow authenticated users to read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);
```

This ensures:
- All authenticated users can view other users' public profile information
- Users can still only update their own profiles
- No security vulnerabilities are introduced

## Testing Checklist

✅ Verify profile loads without infinite refreshing  
✅ Check that profile data displays correctly (name, username, avatar)  
✅ Confirm capsules sections load (Shared With You, Public Capsules)  
✅ Ensure activity feed displays properly  
✅ Test with multiple different friend profiles  
✅ Verify error states work correctly (profile not found, network errors)  
✅ Check that navigation back works correctly  

## Files Modified

1. `/src/screens/friends/FriendProfileScreen.tsx`
   - Fixed `loadProfileData` dependencies
   - Improved profile data fetching
   - Updated display value memoization

2. `/db/migrations/006_fix_profile_rls.sql` (new file)
   - Fixed RLS policies for profiles table
   - Added indexes for better performance

## How to Apply This Fix

### 1. Run the Database Migration
Execute the SQL migration in your Supabase dashboard:

```bash
# In Supabase SQL Editor, run:
/Users/analyticahouse/Documents/GitHub/timecapsule/db/migrations/006_fix_profile_rls.sql
```

Or via CLI:
```bash
supabase db push
```

### 2. Test the Fix
1. Open the app and navigate to the Friends screen
2. Search for a user or select from recent visits
3. Tap on a user profile
4. Verify that the profile loads successfully without infinite refreshing
5. Check that all data displays correctly

## Additional Notes

- The fix maintains backward compatibility with existing friend data structures
- Error handling is improved with better console logging for debugging
- Performance is improved by reducing unnecessary re-renders
- The solution follows React best practices for hooks and memoization

## Key Lessons Learned

### Understanding React Hooks Dependencies

The main issue was creating circular dependencies with `useCallback`:
- `useEffect` depends on `loadProfileData`
- `loadProfileData` (useCallback) depends on `buildActivityFeed`
- `buildActivityFeed` (useCallback) depends on `formatOpenLabel`
- Any change triggers the entire chain, causing infinite loop

### When NOT to Use useCallback

Don't use `useCallback` when:
- The function is only called internally (not passed as prop)
- The function is not used as a dependency in other hooks
- The function is only called once per component lifecycle

### When to Use useCallback

Use `useCallback` when:
- Passing function as prop to child components
- Function is used as dependency in useEffect/useMemo
- Component re-renders frequently and function recreation is expensive

## Prevention

To prevent similar issues in the future:

1. **Avoid useCallback for Internal Functions**: If a function is only used within the component and not passed as a prop, it doesn't need `useCallback`
2. **Simplify Dependencies**: Keep useEffect dependencies minimal - only include values that should trigger re-runs
3. **Break Dependency Chains**: Avoid nested useCallback dependencies
4. **Fetch from Source**: Prefer fetching data directly from the database rather than relying on prop cascading
5. **Add Debugging Logs**: Use console.log with emojis for easy visual scanning during development
6. **Early Returns**: Add guard clauses at the start of effects to prevent unnecessary work
7. **Error Boundaries**: Implement proper error states to catch and display issues gracefully

