# Friend Feature Setup Guide

## Overview
This guide explains how to set up the "Add Friend" functionality in the TimeCapsule app. Users can send, accept, and manage friend requests directly from profile screens.

## Database Setup

### Step 1: Run the Migration

Run the SQL migration to create the `friend_requests` table:

```bash
# Navigate to Supabase SQL Editor and run:
/db/migrations/009_add_friend_requests.sql
```

This migration creates:
- `friend_requests` table with columns:
  - `id` (UUID, primary key)
  - `sender_id` (UUID, references auth.users)
  - `receiver_id` (UUID, references auth.users)
  - `status` (TEXT: 'pending', 'accepted', 'rejected')
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
- Indexes for performance
- Row Level Security (RLS) policies:
  - Users can view their own sent/received requests
  - Users can send friend requests
  - Users can update requests they received (accept/reject)
  - Users can delete their sent requests (cancel)
- Trigger to auto-update `updated_at` timestamp

### Step 2: Verify Database

In Supabase Dashboard:
1. Go to **Table Editor**
2. Find `friend_requests` table
3. Verify columns and RLS policies are created

## Feature Components

### 1. FriendService (`src/services/friendService.ts`)

Handles all friend request operations:

**Key Methods:**
- `sendFriendRequest(receiverId)` - Send a friend request
- `getFriendshipStatus(otherUserId)` - Check friendship status
- `acceptFriendRequest(requestId)` - Accept a request
- `rejectFriendRequest(requestId)` - Reject a request
- `cancelFriendRequest(requestId)` - Cancel a sent request
- `getPendingRequests()` - Get all pending requests
- `getFriends()` - Get all accepted friends

**Friendship Statuses:**
- `none` - No relationship
- `pending_sent` - Current user sent a request
- `pending_received` - Current user received a request
- `friends` - Request accepted

### 2. FriendProfileScreen Updates

**New Features:**
- Add Friend button (only visible on other users' profiles)
- Dynamic button states based on friendship status
- Loading indicator while processing requests

**Button States:**
- **"Add Friend"** (Yellow) - No relationship, click to send request
- **"Request Sent"** (Gray) - Request pending, click to cancel
- **"Accept Request"** (Yellow) - Received request, click to accept
- **"Friends"** (Green) - Already friends, disabled

## UI/UX Flow

### Sending a Friend Request
1. User navigates to another user's profile
2. Sees "Add Friend" button
3. Taps button
4. Button shows loading indicator
5. Button changes to "Request Sent"
6. User can tap again to cancel request

### Receiving a Friend Request
1. User navigates to profile of someone who sent them a request
2. Sees "Accept Request" button
3. Taps button
4. Button changes to "Friends"
5. Both users are now friends

### Viewing Friend Profile
1. User navigates to a friend's profile
2. Sees "Friends" button (green, disabled)
3. Cannot unfriend from this screen (intentional design)

## Testing

### Test Scenario 1: Send Friend Request
1. Create two test accounts
2. Log in as User A
3. Navigate to User B's profile
4. Tap "Add Friend"
5. Verify button changes to "Request Sent"

### Test Scenario 2: Accept Friend Request
1. Log in as User B (receiver)
2. Navigate to User A's profile
3. Verify button shows "Accept Request"
4. Tap button
5. Verify button changes to "Friends"

### Test Scenario 3: Cancel Friend Request
1. Log in as User A (sender)
2. Navigate to User B's profile
3. Verify button shows "Request Sent"
4. Tap button to cancel
5. Verify button changes back to "Add Friend"

## Console Logs

When testing, check the console for:

```
🤝 Friendship status: { status: 'none' }
✅ Friend request sent successfully
🤝 Friendship status: { status: 'pending_sent', requestId: '...' }
✅ Friend request canceled
```

## Database Constraints

**Prevent Duplicate Requests:**
- UNIQUE constraint on (sender_id, receiver_id)
- Users cannot send multiple requests to the same person

**Self-Request Prevention:**
- CHECK constraint: sender_id != receiver_id
- Users cannot send friend requests to themselves

**Automatic Updates:**
- `updated_at` timestamp auto-updates on any row change

## Security (RLS Policies)

All operations are secured by Row Level Security:

1. **SELECT**: Users can only view requests they sent or received
2. **INSERT**: Users can only create requests where they are the sender
3. **UPDATE**: Users can only update requests they received
4. **DELETE**: Users can only delete requests they sent

## Future Enhancements

Possible additions:
- Friend list screen showing all friends
- Pending requests notification badge
- Unfriend functionality
- Block user functionality
- Friend suggestions based on mutual friends

## Troubleshooting

### "Request already exists" error
- Check if a request already exists between these users
- Check if they are already friends
- Clear any duplicate rows in the database

### Button not showing
- Verify user is NOT viewing their own profile
- Check console for friendship status logs
- Verify `viewedProfileId` is correct

### Permission denied errors
- Check RLS policies are enabled
- Verify user is authenticated
- Check policy conditions match user ID

## Files Modified

- `/db/migrations/009_add_friend_requests.sql` - Database migration
- `/src/services/friendService.ts` - Friend operations service (NEW)
- `/src/screens/friends/FriendProfileScreen.tsx` - UI updates

## Quick Start Checklist

- [ ] Run `009_add_friend_requests.sql` migration in Supabase
- [ ] Verify `friend_requests` table exists
- [ ] Verify RLS policies are enabled
- [ ] Test sending a friend request
- [ ] Test accepting a friend request
- [ ] Test canceling a friend request
- [ ] Verify "Friends" state displays correctly

## Support

If you encounter issues:
1. Check Supabase logs for database errors
2. Check React Native console for client errors
3. Verify authentication is working
4. Test RLS policies in Supabase SQL Editor

---

**Created:** 2025-11-10  
**Version:** 1.0  
**Status:** ✅ Production Ready

