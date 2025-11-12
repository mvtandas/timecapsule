# 📊 Profile Visits - Complete Guide

## Overview
Profile visits are now tracked in a real database instead of localStorage, providing:
- ✅ **Persistent data** across devices
- ✅ **Per-user tracking** with timestamps
- ✅ **Real-time updates** when visiting profiles
- ✅ **Privacy controls** with RLS policies

---

## 🎯 How It Works

### Visit Tracking Flow

```
User A → Opens User B's Profile
         │
         ▼
ProfileVisitService.trackVisit(User B's ID)
         │
         ▼
Database: Upsert to profile_visits table
         - viewer_id: User A
         - viewed_user_id: User B
         - visited_at: NOW()
         │
         ▼
Friends Screen → Recent Visits Section
         Shows User B (with timestamp)
```

---

## 📁 Files Created/Modified

### New Files

1. **`/db/migrations/010_add_profile_visits.sql`**
   - Creates `profile_visits` table
   - Adds RLS policies
   - Creates indexes for performance
   - Adds auto-update trigger

2. **`/src/services/profileVisitService.ts`**
   - `trackVisit()` - Records/updates visit
   - `getRecentVisits()` - Fetches visit history
   - `clearVisitHistory()` - Clears all visits
   - `deleteVisit()` - Removes specific visit

### Modified Files

1. **`/src/screens/friends/FriendsScreen.tsx`**
   - Replaced localStorage with `ProfileVisitService`
   - Loads recent visits from database
   - Removed manual visit tracking on navigation

2. **`/src/screens/friends/FriendProfileScreen.tsx`**
   - Added `ProfileVisitService.trackVisit()` in `loadProfileData()`
   - Automatically tracks visit when profile loads
   - Only tracks if viewing another user's profile (not own)

### Deleted Files

1. **`/src/utils/recentVisits.ts`** ❌
   - Old localStorage implementation removed

---

## 🗃️ Database Schema

### Table: `profile_visits`

```sql
CREATE TABLE profile_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(viewer_id, viewed_user_id),
  CHECK (viewer_id != viewed_user_id)
);
```

**Columns:**
- `id`: Unique visit record ID
- `viewer_id`: User who visited the profile
- `viewed_user_id`: User whose profile was visited
- `visited_at`: Timestamp of visit (auto-updates on revisit)

**Constraints:**
- `UNIQUE(viewer_id, viewed_user_id)`: One record per viewer-viewed pair
- `CHECK (viewer_id != viewed_user_id)`: Can't visit own profile

**Indexes:**
- `idx_profile_visits_viewer` - Fast lookup by viewer
- `idx_profile_visits_viewed_user` - Fast lookup by viewed user
- `idx_profile_visits_visited_at` - Fast sorting by timestamp

---

## 🔒 Row Level Security (RLS) Policies

### SELECT Policy
```sql
CREATE POLICY "Users can view their own visit history"
ON profile_visits FOR SELECT
USING (auth.uid() = viewer_id);
```
**Effect:** Users can only see profiles they've visited.

### INSERT Policy
```sql
CREATE POLICY "Users can insert their own visits"
ON profile_visits FOR INSERT
WITH CHECK (
  auth.uid() = viewer_id AND 
  viewer_id != viewed_user_id
);
```
**Effect:** Users can only create visits for themselves, not for others' profiles.

### UPDATE Policy
```sql
CREATE POLICY "Users can update their own visits"
ON profile_visits FOR UPDATE
USING (auth.uid() = viewer_id)
WITH CHECK (auth.uid() = viewer_id);
```
**Effect:** Users can update their visit timestamps (via upsert).

### DELETE Policy
```sql
CREATE POLICY "Users can delete their own visits"
ON profile_visits FOR DELETE
USING (auth.uid() = viewer_id);
```
**Effect:** Users can clear their own visit history.

---

## 🎨 UI/UX Features

### Recent Visits Section (Friends Screen)

**Display:**
- 📋 Shows up to 10 most recent visits
- 🕐 Ordered by most recent first
- 👤 Avatar, username, display name
- 🔄 Auto-refreshes on screen focus

**Empty State:**
```
📭 No recent visits
Search for users above and visit their profiles to see them here
```

**Card Layout:**
```
┌─────────────────────────────┐
│ 👤  @username               │
│     Display Name            │
│     Visited 2h ago          │
└─────────────────────────────┘
```

---

## 💻 Service API

### `ProfileVisitService.trackVisit(viewedUserId: string)`

**Purpose:** Record or update a profile visit.

**Usage:**
```typescript
await ProfileVisitService.trackVisit(user.id);
```

**Behavior:**
- If visit exists → Updates `visited_at`
- If visit doesn't exist → Creates new record
- Ignores if viewing own profile

**Returns:**
```typescript
{ error: any }
```

---

### `ProfileVisitService.getRecentVisits(limit?: number)`

**Purpose:** Get recent profile visits by current user.

**Usage:**
```typescript
const { data, error } = await ProfileVisitService.getRecentVisits(10);
```

**Parameters:**
- `limit` (optional): Max number of visits to return (default: 10)

**Returns:**
```typescript
{
  data: RecentVisitProfile[],
  error: any
}
```

**RecentVisitProfile:**
```typescript
interface RecentVisitProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  visited_at: string;
}
```

---

### `ProfileVisitService.clearVisitHistory()`

**Purpose:** Delete all visit records for current user.

**Usage:**
```typescript
await ProfileVisitService.clearVisitHistory();
```

**Returns:**
```typescript
{ error: any }
```

---

### `ProfileVisitService.deleteVisit(viewedUserId: string)`

**Purpose:** Remove a specific visit from history.

**Usage:**
```typescript
await ProfileVisitService.deleteVisit(user.id);
```

**Returns:**
```typescript
{ error: any }
```

---

## 🔧 Setup Instructions

### Step 1: Run Migration

**Supabase Dashboard → SQL Editor:**

Copy and paste the contents of:
```
/db/migrations/010_add_profile_visits.sql
```

**Expected Output:**
```
✅ Success. No rows returned
```

---

### Step 2: Verify Table

**Supabase Dashboard → Table Editor:**

Check that `profile_visits` table exists with:
- ✅ 4 columns (id, viewer_id, viewed_user_id, visited_at)
- ✅ RLS enabled
- ✅ 4 policies (SELECT, INSERT, UPDATE, DELETE)

---

### Step 3: Reload App

**On Device:**
1. Shake device
2. Tap "Reload"

---

### Step 4: Test

**Test Scenario:**

1. **User A opens app**
   - Friends screen → Recent Visits: Empty

2. **User A searches for User B**
   - Finds User B
   - Opens User B's profile

3. **Visit is tracked**
   ```
   Console: 📊 Profile visit tracked: [User B's ID]
   ```

4. **User A goes back to Friends screen**
   - Recent Visits: User B appears ✅
   - Shows "Just now" timestamp

5. **User A reopens User B's profile**
   - Visit timestamp updates
   - Still only one entry (upsert)

6. **User A visits User C**
   - Recent Visits: User B, User C (ordered by time)

---

## 📊 Console Logs

### When Visit is Tracked
```
📊 Profile visit tracked: abc123-def456-...
```

### When Visits are Loaded
```
📋 Recent visits loaded: 3
```

### If Table Doesn't Exist Yet
```
⚠️ Profile visits table not found. Run migration 010 to enable this feature.
```

---

## 🧪 Testing Scenarios

### Scenario 1: First Visit
1. User A visits User B's profile
2. ✅ Record created in database
3. ✅ User B appears in Recent Visits

### Scenario 2: Revisit
1. User A visits User B again (already visited)
2. ✅ `visited_at` updated
3. ✅ User B moves to top of Recent Visits

### Scenario 3: Multiple Visits
1. User A visits User B, C, D
2. ✅ Recent Visits shows: D, C, B (most recent first)

### Scenario 4: Own Profile
1. User A views their own profile
2. ✅ Visit NOT tracked
3. ✅ No record created

### Scenario 5: Deleted Profile
1. User A visited User B
2. User B deletes account
3. ✅ Visit record deleted (ON DELETE CASCADE)
4. ✅ User B removed from Recent Visits

---

## 🎯 Key Differences from Old System

| Feature | Old (localStorage) | New (Database) |
|---------|-------------------|----------------|
| **Storage** | Device-specific | Cloud, multi-device |
| **Persistence** | Lost on clear data | Permanent |
| **Limit** | Manual (10 items) | Database query |
| **Privacy** | No RLS | Full RLS protection |
| **Sync** | None | Real-time |
| **Performance** | Instant | Network call |
| **Upsert** | Manual logic | Native upsert |

---

## 🚀 Performance Optimizations

### Indexes
```sql
CREATE INDEX idx_profile_visits_viewer ON profile_visits(viewer_id);
CREATE INDEX idx_profile_visits_viewed_user ON profile_visits(viewed_user_id);
CREATE INDEX idx_profile_visits_visited_at ON profile_visits(visited_at);
```

**Benefits:**
- ⚡ Fast lookup by viewer (O(log n))
- ⚡ Fast sorting by timestamp
- ⚡ Efficient JOIN with profiles table

### Upsert Strategy
```typescript
.upsert({ ... }, { onConflict: 'viewer_id,viewed_user_id' })
```

**Benefits:**
- ✅ Single query (not SELECT + INSERT/UPDATE)
- ✅ Prevents duplicates
- ✅ Auto-updates timestamp

---

## 🔐 Privacy & Security

### What Users CAN Do
- ✅ View their own visit history
- ✅ Track visits to others' profiles
- ✅ Delete their own visit history
- ✅ Update visit timestamps (via upsert)

### What Users CANNOT Do
- ❌ See who visited their profile
- ❌ Track visits for other users
- ❌ Delete others' visit history
- ❌ Create fake visits

---

## 🐛 Troubleshooting

### Issue: "profile_visits table not found"
**Solution:** Run migration 010

### Issue: Recent Visits not showing
**Check:**
1. Migration run successfully?
2. User authenticated?
3. Actually visited profiles?
4. Console for errors?

### Issue: Visit not updating timestamp
**Check:**
1. `UNIQUE(viewer_id, viewed_user_id)` constraint exists?
2. Upsert using `onConflict` parameter?
3. Trigger `update_profile_visits_visited_at_trigger` exists?

### Issue: Own profile appears in Recent Visits
**Check:**
1. `CHECK (viewer_id != viewed_user_id)` constraint exists?
2. Frontend check: `if (currentUser.id !== viewedUserId)` exists?

---

## 📈 Future Enhancements

Possible additions:
- [ ] View count per profile
- [ ] "Who viewed my profile" feature (opt-in)
- [ ] Visit analytics (most viewed profiles)
- [ ] Export visit history
- [ ] Visit notifications
- [ ] Privacy settings (hide visits)

---

## ✅ Complete Checklist

- [x] Migration file created
- [x] ProfileVisitService created
- [x] FriendsScreen updated
- [x] FriendProfileScreen updated
- [x] Old localStorage file deleted
- [x] RLS policies configured
- [x] Indexes added
- [x] Auto-update trigger added
- [x] Self-visit prevention
- [x] Upsert logic implemented
- [x] Error handling added
- [x] Console logs added
- [x] Documentation complete

---

**Status:** ✅ Production Ready  
**Version:** 1.0  
**Created:** 2025-11-10  
**Migration:** `010_add_profile_visits.sql`

---

## 📚 Related Documentation

- `FRIEND_FEATURE_SETUP.md` - Friend requests system
- `FRIEND_QUICK_START.md` - Friend system overview
- `FRIEND_REQUESTS_NOTIFICATION.md` - Notification modal

---

**Ready to use! Run the migration and test!** 🚀

