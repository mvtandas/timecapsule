# Account Settings - Supabase Integration

## Overview
Implemented full Supabase persistence for Account Settings, allowing users to update their email, username, and phone number with proper validation, error handling, and real-time sync.

---

## Changes Made

### 1. **AuthService** (`src/lib/auth.ts`)

#### New Method: `updateEmail()`
Updates user email via Supabase Auth and syncs with profiles table.

```typescript
static async updateEmail(newEmail: string) {
  // Updates via supabase.auth.updateUser()
  // Also updates profiles table for consistency
  // Returns { data, error }
}
```

**What it does:**
- ✅ Updates email in `auth.users` table via `supabase.auth.updateUser()`
- ✅ Updates email in `profiles` table for username lookup
- ✅ Handles authentication flow (may trigger email verification)
- ✅ Returns error if update fails

#### Enhanced Method: `updateProfile()`
Now includes username uniqueness validation.

```typescript
static async updateProfile(updates: Partial<User>) {
  // Check if username is already taken (excluding current user)
  // Convert username to lowercase
  // Update profiles table
  // Returns { data, error }
}
```

**Improvements:**
- ✅ **Username uniqueness check** - prevents duplicate usernames
- ✅ **Excludes current user** - allows keeping same username
- ✅ **Lowercase conversion** - ensures case-insensitive usernames
- ✅ **Error specificity** - "Username is already taken" message
- ✅ **Type safety** - uses `as any` for new columns

---

### 2. **AuthStore** (`src/store/authStore.ts`)

#### New Method: `updateEmail()`
```typescript
updateEmail: async (newEmail: string) => Promise<{ error: any }>
```

**What it does:**
- Calls `AuthService.updateEmail()`
- Refreshes user data after successful update
- Updates global auth state
- Returns error if any

#### Enhanced: `updateProfile()`
- Added type assertion `as User` for better type safety
- Properly merges updated data with existing user state

---

### 3. **AccountSettingsScreen** (`src/screens/profile/AccountSettingsScreen.tsx`)

#### Completely Redesigned `handleSaveInfo()`

**Before:**
```typescript
// Old - just called updateProfile with all fields
await updateProfile({
  email: editEmail,
  username: editUsername,
  phone_number: editPhoneNumber,
});
```

**After:**
```typescript
// New - handles email and profile updates separately
// 1. Check what changed
const emailChanged = editEmail !== user?.email;
const usernameChanged = editUsername !== user?.username;
const phoneChanged = editPhoneNumber !== user?.phone_number;

// 2. Update email via auth if changed
if (emailChanged) {
  await AuthService.updateEmail(editEmail);
}

// 3. Update username/phone via profiles if changed
if (usernameChanged || phoneChanged) {
  await updateProfile({ username, phone_number });
}

// 4. Refresh user data
await AuthService.getCurrentUser();
```

**Improvements:**
- ✅ **Selective updates** - only updates changed fields
- ✅ **Separate email handling** - via auth service
- ✅ **Better error messages** - specific to each field
- ✅ **Loading states** - shows spinner during save
- ✅ **Success feedback** - confirmation alert
- ✅ **Data refresh** - reflects changes immediately

#### Enhanced Validation

**Email Validation:**
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

**Username Validation:**
```typescript
const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
// 3-20 characters, alphanumeric + underscores
```

**Phone Validation:**
```typescript
const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
// Optional, at least 10 digits, allows international format
```

---

## User Flow

### Editing Account Information:

```
1. User taps "Edit" icon
   ↓
2. Input fields become editable
   ↓
3. User modifies Email, Username, or Phone
   ↓
4. User taps "Save Changes"
   ↓
5. Client-side validation runs
   ↓
6. If email changed:
   - Update via supabase.auth.updateUser()
   - Update profiles table email
   ↓
7. If username/phone changed:
   - Check username uniqueness
   - Update profiles table
   ↓
8. Refresh user data from Supabase
   ↓
9. Show success message
   ↓
10. UI reflects changes immediately
```

---

## API Calls

### 1. Update Email
```typescript
// Auth service
const { data, error } = await supabase.auth.updateUser({
  email: newEmail,
});

// Then update profiles
await supabase
  .from('profiles')
  .update({ email: newEmail })
  .eq('id', user.id);
```

### 2. Update Username & Phone
```typescript
// Check uniqueness first
const { data: existing } = await supabase
  .from('profiles')
  .select('id')
  .eq('username', username.toLowerCase())
  .neq('id', currentUserId)
  .maybeSingle();

if (existing) {
  throw new Error('Username is already taken');
}

// Update profiles
await supabase
  .from('profiles')
  .update({
    username: username.toLowerCase(),
    phone_number: phoneNumber,
  })
  .eq('id', user.id);
```

---

## Error Handling

### Email Update Errors:
- ❌ **Invalid format** - "Please enter a valid email address"
- ❌ **Already in use** - Supabase returns error if email exists
- ❌ **Network error** - "Failed to update email"

### Username Update Errors:
- ❌ **Invalid format** - "Username must be 3-20 characters long and contain only letters, numbers, and underscores"
- ❌ **Already taken** - "Username is already taken. Please choose a different one."
- ❌ **Empty** - Allowed (username is optional)

### Phone Update Errors:
- ❌ **Invalid format** - "Please enter a valid phone number"
- ❌ **Empty** - Allowed (phone is optional)

### Network Errors:
- ❌ **Connection failed** - "Failed to update account information. Please try again."
- ❌ **Timeout** - Handled by Supabase client

---

## UI States

### Display Mode:
- Shows current email, username, phone
- Edit icon visible (top-right)
- All values read-only

### Edit Mode:
- Input fields enabled
- Cancel and Save buttons visible
- Real-time validation on input
- Hints below fields

### Saving State:
- Loading spinner on Save button
- All inputs disabled
- Cancel button disabled
- "Saving..." indicator

### Success State:
- Alert: "Account information updated successfully!"
- Returns to display mode
- UI reflects new values

### Error State:
- Alert with specific error message
- Stays in edit mode
- User can retry or cancel

---

## Data Sync

### Local State Update:
```typescript
// After successful save, refresh user data
const { user: updatedUser } = await AuthService.getCurrentUser();

// Auth store automatically updates via listener
AuthService.onAuthStateChange((event, session) => {
  // Triggered when email changes
  useAuthStore.setState({ session, user });
});
```

### Automatic Sync:
- Email changes trigger `onAuthStateChange`
- Profile updates reflected immediately
- All screens using `useAuthStore` get updates
- No manual refresh needed

---

## Database Requirements

### Profiles Table Schema:
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  username TEXT UNIQUE,
  email TEXT,
  phone_number TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);
```

### Required Permissions:
```sql
-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can read own profile
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);
```

---

## Testing Checklist

### Email Update:
- [ ] Can update to new valid email
- [ ] Cannot use invalid email format
- [ ] Cannot use email already taken by another user
- [ ] Email change triggers verification (if enabled)
- [ ] UI reflects new email immediately
- [ ] Login still works with new email

### Username Update:
- [ ] Can update to new valid username
- [ ] Cannot use username < 3 characters
- [ ] Cannot use username > 20 characters
- [ ] Cannot use special characters (except _ )
- [ ] Cannot use duplicate username
- [ ] Username stored in lowercase
- [ ] Can keep same username (no error)
- [ ] Empty username allowed (optional field)

### Phone Update:
- [ ] Can update to new phone number
- [ ] Can use international format (+1234567890)
- [ ] Can use dashes and spaces (123-456-7890)
- [ ] Can leave empty (optional)
- [ ] Invalid format shows error
- [ ] UI reflects new phone immediately

### General:
- [ ] Loading state shows during save
- [ ] Success message appears after save
- [ ] Error messages are specific and helpful
- [ ] Cancel button restores original values
- [ ] No changes = no API calls
- [ ] Multiple field updates work together
- [ ] Network errors handled gracefully
- [ ] Back button works during edit

---

## Security Considerations

✅ **Email Verification** - Supabase can require email verification for changes
✅ **Username Uniqueness** - Server-side check prevents duplicates
✅ **Lowercase Usernames** - Case-insensitive lookup
✅ **Input Validation** - Client and server-side
✅ **User Isolation** - Can only update own profile
✅ **RLS Policies** - Database-level security
✅ **No Password in Profile** - Separate auth flow required

---

## Known Limitations

1. **Email Verification** - Supabase may send verification email for changes
2. **Username Change Limit** - Consider adding rate limiting
3. **Phone Verification** - Not implemented (optional enhancement)
4. **Profile History** - No audit log of changes (optional enhancement)
5. **Username Reservation** - Old username becomes available immediately

---

## Future Enhancements

### Possible additions:
1. **Email Verification Status** - Show if email is verified
2. **Username Availability Checker** - Real-time feedback
3. **Phone Verification** - SMS verification flow
4. **Change History** - Audit log of profile changes
5. **Username Cooldown** - Limit frequency of changes
6. **Profile Completeness** - Show percentage filled
7. **Two-Factor Auth** - Additional security layer

---

## Files Modified

- ✅ `src/lib/auth.ts` - Added `updateEmail()`, enhanced `updateProfile()`
- ✅ `src/store/authStore.ts` - Added `updateEmail()` method
- ✅ `src/screens/profile/AccountSettingsScreen.tsx` - Enhanced save logic

---

## Summary

✅ **Email Updates** - Via Supabase Auth + profiles sync
✅ **Username Updates** - With uniqueness validation
✅ **Phone Updates** - With format validation
✅ **Proper Validation** - Client-side regex checks
✅ **Error Handling** - Specific, user-friendly messages
✅ **Loading States** - Visual feedback during save
✅ **Success Feedback** - Confirmation alerts
✅ **Data Sync** - Real-time UI updates
✅ **Security** - RLS policies and input validation

Account settings now fully persist to Supabase with proper error handling and user feedback! 🎉

