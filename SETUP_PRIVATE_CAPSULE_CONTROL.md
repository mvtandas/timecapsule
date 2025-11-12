# Private Capsule Access Control - Quick Setup Guide

## 🚀 Quick Start

### Step 1: Run Database Migration
```bash
# In Supabase SQL Editor, run:
db/migrations/012_add_notifications.sql
```

This creates:
- ✅ `notifications` table
- ✅ `visibility` column in capsules
- ✅ RLS policies for notifications
- ✅ Triggers for updated_at

### Step 2: Verify Implementation

All code changes are already implemented:

✅ **NotificationService** (`src/services/notificationService.ts`)
- Send notifications when sharing private capsules
- Get user notifications
- Mark as read
- Real-time subscriptions

✅ **CreateCapsuleScreen** Updated
- Sends notifications to shared users after creating private capsule
- Integrated with NotificationService

✅ **DashboardScreen** (Already has distance logic)
- Map markers show different visual states
- Distance-based unlock (1km radius)
- Access control checks

✅ **CapsuleDetailsScreen** (Already has distance warnings)
- Shows distance warnings
- Blur effects for inaccessible content

✅ **RLS Policies** (Already in migration 011)
- Only shared users can access private capsules
- Server-side security enforced

## 📋 How It Works

### Creating Private Capsule
1. User creates capsule, selects "Private"
2. Searches and selects friends to share with
3. Saves capsule → **Notifications sent automatically** 📬
4. Each friend receives: "*{username} shared a private capsule with you.*"

### Viewing on Map
- **Public**: 🌍 Globe icon (yellow)
- **Private + Shared with you**: 🔓 Unlocked look (orange/visible)
- **Private + Not shared**: 🔒 Locked look (red/faded)

### Opening Capsule
**Checks performed automatically:**
1. Is it shared with me?
   - ❌ No → "*This capsule isn't shared with you*"
   - ✅ Yes → Continue
2. Am I within 1km?
   - ❌ No → "*Get within 1km to unlock*"
   - ✅ Yes → **Open capsule!** ✅

### Visual Indicators (Already Implemented)
- **Distance badges**: Color-coded by proximity
- **Blur effects**: Applied to distant/inaccessible capsules
- **Lock overlays**: Show on inaccessible content
- **Warning banners**: Display in detail screens

## 🔒 Security Features

### Database (RLS Policies)
```sql
-- Capsules: Only accessible if public, owned, or shared
auth.uid() = ANY(shared_with)

-- Notifications: Only receiver can read
auth.uid() = receiver_id
```

### Client-Side (Distance Utils)
```typescript
// Combined checks in handleMarkerPress:
1. Check shared_with array
2. Calculate distance
3. Enforce 1km radius
```

## 🧪 Testing

### Test Scenario 1: Share Private Capsule
1. **User A**: Create private capsule
2. **User A**: Select User B to share
3. **User A**: Save capsule
4. **User B**: 📬 Receives notification
5. **User B**: Sees capsule on map (🔓 unlock icon)
6. **User B**: Must be within 1km to open

### Test Scenario 2: Not Shared
1. **User A**: Create private capsule
2. **User A**: Share with User B only
3. **User C**: Sees capsule on map (🔒 lock icon, faded)
4. **User C**: Taps → "*This capsule isn't shared with you*"

### Test Scenario 3: Too Far
1. **User B**: Has access (in shared_with)
2. **User B**: 2km away from capsule
3. **User B**: Taps → "*Get within 1km to unlock*"
4. **User B**: Moves to 0.5km
5. **User B**: Can now open capsule ✅

## 📊 Console Logs

When everything works, you'll see:
```
📬 Sending notifications to shared users...
✅ Sent 2 notification(s)
📦 Creating capsule: { isPublic: false, sharedWith: 2 }
✅ Capsule created successfully

// On friend's device:
🔔 New notification received: {type: 'private_capsule', ...}
📍 Distance status: {distance: 0.8, withinOpenRadius: true, ...}
✅ Opening capsule detail
```

## 🎯 Key Points

1. **Notifications**: Automatic when sharing private capsules
2. **Distance**: 1km radius for ALL capsules (public and private)
3. **Access**: Private capsules require being in `shared_with` array
4. **Visual**: Different icons/colors for private vs public
5. **Security**: RLS policies enforce server-side

## ⚠️ Troubleshooting

### Notifications not sending?
- Check: Migration 012 ran successfully
- Check: NotificationService imported in CreateCapsuleScreen
- Check: Console logs show "Sending notifications..."

### Can't open shared capsule?
- Check: Distance < 1km (use console logs)
- Check: User ID in capsule's `shared_with` array
- Check: RLS policies allow access

### Map icons not changing?
- Check: `is_public` field in capsules table
- Check: `shared_with` array populated correctly
- Check: Current user ID matches

## 📚 Documentation
- Full details: `PRIVATE_CAPSULE_ACCESS_CONTROL.md`
- Distance system: `DISTANCE_BASED_VISIBILITY.md`
- Auth persistence: `AUTH_PERSISTENCE_FIX.md`

## ✅ You're Done!

The system is fully implemented and ready to use. Just run the migration and test!

🎉 **Private capsule access control is complete!**

