# 🔔 Friend Requests Notification - Quick Start

## ⚡ 2-Minute Setup

### Prerequisites
✅ Database migration already run (`009_add_friend_requests.sql`)  
✅ FriendService already created  
✅ Code already integrated in FriendsScreen  

### What You Get

```
Friends Screen Header
┌────────────────────────────┐
│ My Friends           🔔3   │  ← Red badge with count
└────────────────────────────┘
         │ Tap
         ▼
┌────────────────────────────┐
│ [Blur Background]          │
│  Friend Requests       ✕   │
│  ─────────────────────────│
│  👤 John Doe               │
│     @johndoe               │
│     2h ago         ✅  ❌  │
└────────────────────────────┘
```

---

## 🚀 How to Use

### As a User

1. **Open Friends Tab** in app
2. **Look top-right** for notification icon (👥+)
3. **See red badge** if you have pending requests
4. **Tap icon** → Modal opens
5. **Accept** ✅ or **Decline** ❌ requests

### As a Developer

**No setup needed!** Code is already integrated. Just reload the app.

```bash
# Reload app
# On device: Shake and tap "Reload"
```

---

## 🎯 Features

| Feature | Description |
|---------|-------------|
| 🔔 **Badge** | Red circle with count (1-9, or 9+) |
| 📱 **Modal** | Bottom sheet with smooth animation |
| 💫 **Blur** | Dark background blur effect |
| ✅ **Accept** | Green button, adds friend |
| ❌ **Decline** | Red button, rejects request |
| 🔄 **Real-time** | Badge updates automatically |
| 📊 **Empty State** | Friendly message when no requests |

---

## 🧪 Quick Test

### Scenario 1: No Requests
1. Open Friends screen
2. Icon visible, **no badge**
3. Tap icon → "No new friend requests"

### Scenario 2: Has Requests
1. Have another user send you a friend request
2. Open Friends screen → **Badge shows count**
3. Tap icon → See request list
4. Tap ✅ Accept → Request disappears, badge updates

### Scenario 3: Modal Interaction
1. Tap notification icon → Modal slides up
2. Tap outside modal → Modal closes
3. Tap ✕ button → Modal closes

---

## 📊 Badge Behavior

| Pending Requests | Badge Display |
|-----------------|---------------|
| 0 | Hidden (no badge) |
| 1 | Shows "1" |
| 5 | Shows "5" |
| 9 | Shows "9" |
| 12 | Shows "9+" |
| 100 | Shows "9+" |

---

## 🎨 UI Elements

### Notification Icon
- **Position**: Top-right of header
- **Icon**: `person-add`
- **Size**: 24px
- **Color**: Dark gray

### Badge
- **Color**: Red (`#ef4444`)
- **Shape**: Circle
- **Font**: 11px, bold, white
- **Position**: Top-right corner of icon

### Action Buttons
- **Accept**: Green circle, checkmark icon
- **Decline**: Red circle, X icon
- **Size**: 40x40px
- **Feedback**: Loading spinner when processing

---

## 🔍 Console Logs

Watch for these logs when testing:

```
🔔 Pending requests loaded: 3
✅ Friend request accepted
✅ Friend request declined
🤝 Friendship status: { status: 'friends' }
```

---

## 🐛 Troubleshooting

### Badge not showing?
- Check: Do you have pending requests?
- Check: Is user authenticated?
- Solution: Look at console for errors

### Modal not opening?
- Check: Did you tap the icon?
- Check: Is there a JavaScript error?
- Solution: Reload app

### Requests not loading?
- Check: Did you run `009_add_friend_requests.sql`?
- Check: Are RLS policies enabled?
- Solution: Check Supabase logs

### Buttons not working?
- Check: Is request already processed?
- Check: Is there a network error?
- Solution: Check console logs

---

## 📁 Files

### New Files
- `FRIEND_REQUESTS_NOTIFICATION.md` - Full documentation

### Modified Files
- `src/screens/friends/FriendsScreen.tsx` - Added notification + modal

### Dependencies Used
- `expo-blur` - BlurView component
- `react-native` - Animated API
- `src/services/friendService.ts` - Backend logic

---

## 🎯 Complete Features Checklist

- [x] Notification icon in header
- [x] Red badge with count
- [x] Badge hides when no requests
- [x] Bottom sheet modal
- [x] Smooth slide-up animation
- [x] Blur background
- [x] Tap outside to close
- [x] Accept button (green)
- [x] Decline button (red)
- [x] Loading spinner during processing
- [x] Empty state message
- [x] Sender avatar display
- [x] Username and display name
- [x] Time sent ("2h ago")
- [x] Real-time badge updates
- [x] Friends list auto-refresh

---

## 🚀 Next Steps

Want to enhance further?
- [ ] Push notifications
- [ ] Sound/vibration feedback
- [ ] Swipe to accept/decline
- [ ] Request message support

---

## 📚 Related Docs

- `FRIEND_FEATURE_SETUP.md` - Add Friend button
- `FRIEND_QUICK_START.md` - Friend system overview
- `FRIEND_REQUESTS_NOTIFICATION.md` - This feature (detailed)

---

**Status:** ✅ Ready to Use  
**Setup Time:** 0 minutes (already integrated)  
**Version:** 1.0  
**Created:** 2025-11-10

---

## 🎉 You're Done!

Just **reload the app** and start using friend requests! 🚀

