# 🤝 Add Friend Feature - Quick Start

## ⚡ Quick Setup (2 minutes)

### Step 1: Run Database Migration
```sql
-- In Supabase SQL Editor, run:
/db/migrations/009_add_friend_requests.sql
```

### Step 2: Verify Installation
✅ Code is already integrated  
✅ FriendService created  
✅ FriendProfileScreen updated  

### Step 3: Test It!
1. **Open app** → Navigate to any user's profile
2. **See "Add Friend" button** → Tap it
3. **Button changes to "Request Sent"** → Success!

---

## 🎯 How It Works

### Button States

| State | Display | Color | Action |
|-------|---------|-------|--------|
| **No relationship** | "Add Friend" ➕ | Yellow | Send request |
| **Request sent** | "Request Sent" ⏰ | Gray | Cancel request |
| **Request received** | "Accept Request" ➕ | Yellow | Accept request |
| **Already friends** | "Friends" ✓ | Green | Disabled |

### User Flow

```
User A                           User B
  │                                │
  ├─ Opens B's profile             │
  ├─ Taps "Add Friend"            │
  ├─ Button → "Request Sent"      │
  │                                │
  │                            ├─ Opens A's profile
  │                            ├─ Sees "Accept Request"
  │                            ├─ Taps button
  │                            ├─ Button → "Friends"
  │                                │
  ├─ Refreshes profile             │
  ├─ Button → "Friends"           │
```

---

## 🔒 Security Features

- ✅ Users can't add themselves
- ✅ No duplicate requests
- ✅ Row Level Security (RLS) enabled
- ✅ Only involved users can view requests

---

## 📁 Files

### New Files
- `db/migrations/009_add_friend_requests.sql` - Database schema
- `src/services/friendService.ts` - Business logic
- `FRIEND_FEATURE_SETUP.md` - Full documentation
- `FRIEND_QUICK_START.md` - This file

### Modified Files
- `src/screens/friends/FriendProfileScreen.tsx` - UI integration

---

## 🧪 Testing

### Test 1: Send Request
1. Log in as User A
2. Navigate to User B's profile
3. Tap "Add Friend"
4. ✓ Button should show "Request Sent"

### Test 2: Accept Request
1. Log in as User B
2. Navigate to User A's profile
3. Tap "Accept Request"
4. ✓ Button should show "Friends"

### Test 3: Cancel Request
1. Log in as User A (sender)
2. Navigate to User B's profile
3. Tap "Request Sent" button
4. ✓ Button should show "Add Friend" again

---

## 🐛 Troubleshooting

### Button not visible?
- Check: Are you viewing your own profile? (Button is hidden)
- Check: Is user authenticated?

### "Request already exists" error?
- Solution: Request is already pending or users are already friends

### Permission denied?
- Check: Run the migration first
- Check: RLS policies are enabled

---

## 📊 Database Schema

```sql
friend_requests
├─ id (UUID)
├─ sender_id (UUID) → auth.users
├─ receiver_id (UUID) → auth.users
├─ status (pending | accepted | rejected)
├─ created_at (timestamp)
└─ updated_at (timestamp)
```

---

## 🚀 Next Steps

Want to add more features?
- [ ] Friend list screen
- [ ] Notification badge for pending requests
- [ ] Unfriend functionality
- [ ] Block user feature

See `FRIEND_FEATURE_SETUP.md` for detailed documentation.

---

**Status:** ✅ Ready to use  
**Version:** 1.0  
**Created:** 2025-11-10

