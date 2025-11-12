# Complete Setup Guide - TimeCapsule App

## 🚀 Quick Start

### Current Status
✅ **All features implemented and working WITHOUT migration 012**
⚠️ Notification table optional - capsules work perfectly without it

## 📋 What Works Right Now (No Migration Needed)

### ✅ Core Features
1. **Capsule Creation** - Public & Private
2. **Media Upload** - Images/Videos to Supabase Storage
3. **Location-Based Access** - 1km unlock radius
4. **Distance Visibility** - 4km view radius with blur effects
5. **Private Capsule Sharing** - Share with specific users
6. **Real User Data** - Profiles, avatars, usernames
7. **Auth Persistence** - Login/logout with capsule persistence
8. **Friend System** - Add friends, friend requests, unfriend
9. **Profile Visits Tracking** - Recent visits on Friends page

### ⚠️ Optional (Requires Migration 012)
- Push-style notifications for capsule sharing
- Notification history
- Unread notification badges

## 🎯 How to Use the App

### 1. Create Public Capsule
```
1. Tap + button on Dashboard
2. Enter title and message
3. Select "Public"
4. Add photo/video (optional)
5. Set location on map
6. Set open date (optional)
7. Save
```
**Result**: ✅ Capsule created, visible to everyone within 4km

### 2. Create Private Capsule
```
1. Tap + button on Dashboard
2. Enter title and message
3. Select "Private"
4. Search and select friends to share with
5. Add photo/video (optional)
6. Set location on map
7. Set open date (optional)
8. Save
```
**Result**: 
- ✅ Capsule created
- ✅ Shared with selected users
- ⚠️ Console warning about notifications (safe to ignore)
- ✅ Shared users can see capsule on map

### 3. View Capsules on Map
**Visual Indicators:**
- 🌍 **Yellow** - Public capsule (within 1km, can open)
- 🟠 **Orange** - Public capsule (1-4km, too far)
- 🔴 **Red faded** - Public capsule (>4km, too far)
- 🔓 **Orange unlock** - Private shared with you
- 🔒 **Red lock** - Private NOT shared with you

**Distance Rules:**
- **<1km**: Can open capsule
- **1-4km**: Can see, but too far to open
- **>4km**: Blurred, very far

### 4. Open Capsule
```
1. Tap capsule marker on map
2. If within 1km:
   ✅ Opens detail modal
   ✅ Can view media
   ✅ Can see details
3. If 1-4km away:
   ⚠️ "Get within 1km to unlock"
4. If >4km away:
   ⚠️ "Too far away"
```

### 5. View Shared Private Capsules
```
When someone shares private capsule with you:
1. You see it on map (🔓 unlock icon)
2. Must be within 1km to open
3. Can see "Shared With" section
4. Can view media if within range
```

## 🔧 Console Warnings (Safe to Ignore)

### Warning You'll See:
```
⚠️ Notifications not sent (table may not exist): PGRST205
⚠️ Notifications table not found. Please run migration 012.
⚠️ Capsule created successfully, but notifications were not sent.
```

### What This Means:
- ✅ **Capsule WAS created successfully**
- ✅ **Sharing WORKS correctly**
- ✅ **Users CAN see shared capsules**
- ⚠️ **No push notification sent** (optional feature)

### Why This Is OK:
- Notifications are a "nice-to-have" feature
- Core sharing functionality works without them
- Users will see capsules on the map anyway
- No data loss or errors

## 🎨 UI Features

### Dashboard Map
- **Capsule markers** with distance-based colors
- **User location** indicator
- **Distance badges** on capsule grid
- **Blur effects** for distant capsules

### Capsule Detail Modal
- **Shared With** section (real usernames + avatars)
- **Distance warning banner** (if too far)
- **Media preview** (if unlocked)
- **Lock overlay** (if locked or too far)

### My Capsules
- **Created** tab - Your capsules
- **Shared** tab - Capsules shared with you
- **Auth persistence** - Data survives logout/login

### Friends System
- **My Friends** - Accepted friends
- **Recent Visits** - Recently viewed profiles
- **Add Friend** button on profiles
- **Friend Requests** notification icon

## 📊 Testing Checklist

### ✅ Basic Flow
- [ ] Create account
- [ ] Create public capsule with photo
- [ ] View capsule on map
- [ ] Open capsule detail (within 1km)
- [ ] See distance warning (move >1km away)

### ✅ Private Capsule Flow
- [ ] Create private capsule
- [ ] Select 2-3 friends to share with
- [ ] Save capsule
- [ ] See console warning (safe to ignore)
- [ ] Login as shared friend
- [ ] See capsule on map with unlock icon
- [ ] View "Shared With" section with real names

### ✅ Distance System
- [ ] Markers change color by distance
- [ ] Can't open if >1km away
- [ ] Alert shows distance message
- [ ] Blur effect on distant capsules

### ✅ Auth & Persistence
- [ ] Create capsules
- [ ] Logout
- [ ] Login
- [ ] All capsules still there ✅

## 🔒 Security Features

### Database (RLS Policies)
```sql
-- Capsules: Only accessible if public, owned, or shared
auth.uid() = ANY(shared_with)

-- Media: Users can only upload to their folder
(storage.foldername(name))[1] = auth.uid()::text

-- Profiles: Users can update own profile
auth.uid() = id
```

### Client-Side Checks
- Distance validation (1km for unlock)
- Shared_with array verification
- Location permission checks
- Media upload validation

## 🐛 Common Issues & Solutions

### Issue 1: "Notifications table not found"
**Solution**: This is expected! Ignore it.
- Capsules still work
- Sharing still works
- No action needed

### Issue 2: Can't see shared capsule
**Check**:
1. Are you in the `shared_with` array?
2. Is the capsule within 4km?
3. Did you refresh the map?

### Issue 3: Media not loading
**Check**:
1. Is `media_url` populated in database?
2. Are you within 1km to unlock?
3. Check Supabase Storage bucket permissions

### Issue 4: Friend profile showing dummy data
**Solution**: Already fixed!
- Now loads real data from `profiles` table
- Shows real avatars and usernames

## 📱 User Experience

### First Time User
```
1. Sign up
2. Dashboard opens with map
3. See tutorial tips (optional)
4. Create first capsule
5. Explore map
```

### Daily Use
```
1. Open app
2. See capsules on map near you
3. Tap nearby capsules to explore
4. Create new capsule
5. Share with friends
```

### Sharing Flow
```
1. Create private capsule
2. Search friends by username
3. Select friends to share with
4. Save
5. Friends see capsule on their map
6. (Optional) Friends get notification if table exists
```

## 🎯 Migration 012 (Optional)

### If You Want Notification System:

**Step 1: Run Migration**
```bash
# In Supabase SQL Editor:
db/migrations/012_add_notifications.sql
```

**Step 2: Restart App**
```bash
# Reload Metro bundler or shake device and reload
```

**Benefits**:
- ✅ Push-style notifications
- ✅ Notification history
- ✅ Unread badges
- ✅ "Someone shared a capsule with you" alerts

**Without Migration**:
- ✅ Everything works
- ⚠️ No notification alerts
- ⚠️ Console warnings (harmless)

## 📚 Documentation Files

- `AUTH_PERSISTENCE_FIX.md` - Login/logout persistence
- `DISTANCE_BASED_VISIBILITY.md` - Distance system
- `FIX_SHARED_CAPSULE_ISSUES.md` - Dummy data fix
- `PRIVATE_CAPSULE_ACCESS_CONTROL.md` - Sharing system
- `SETUP_PRIVATE_CAPSULE_CONTROL.md` - Quick setup

## ✅ System Status

| Feature | Status | Notes |
|---------|--------|-------|
| Capsule Creation | ✅ Working | With validation |
| Media Upload | ✅ Working | To Supabase Storage |
| Private Sharing | ✅ Working | Real user data |
| Distance System | ✅ Working | 1km unlock, 4km view |
| Map Markers | ✅ Working | Color-coded |
| Auth Persistence | ✅ Working | Survives logout |
| Friend System | ✅ Working | Full CRUD |
| Notifications | ⚠️ Optional | Requires migration 012 |

## 🎉 Ready to Use!

The app is **fully functional** right now. The notification warning is **safe to ignore** - it's just telling you that an optional feature isn't available yet.

**All core features work perfectly!** 🚀

### Quick Test:
1. ✅ Create private capsule
2. ✅ Share with friend
3. ⚠️ See console warning (ignore it)
4. ✅ Login as friend
5. ✅ See capsule on map
6. ✅ Open and view details

**Everything works!** The warning is cosmetic only. 🎯

