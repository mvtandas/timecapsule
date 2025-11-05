# Username Support - Authentication Update

## Overview
Updated the authentication flow to support username-based signup and login, in addition to the existing email-based authentication.

---

## Changes Made

### 1. **Sign Up Screen** (`src/screens/auth/SignupScreen.tsx`)

#### New Features:
- ✅ Added **Username** input field (between Full Name and Email)
- ✅ Username validation:
  - Length: 3-20 characters
  - Allowed characters: letters, numbers, underscores, periods
  - Must start with a letter or number
  - Automatically converted to lowercase
- ✅ Username uniqueness check
- ✅ Improved error messages for username-related errors

#### Validation Rules:
```typescript
- Length: 3-20 characters
- Regex: /^[a-zA-Z0-9_.]+$/
- Must start with: letter or number
- Case: converted to lowercase before storage
```

#### UI Changes:
- New input with `alternate-email` icon
- Placeholder: "Username (3-20 characters)"
- Field is **required**

---

### 2. **Login Screen** (`src/screens/auth/LoginScreen.tsx`)

#### New Features:
- ✅ **Username or Email** login support
- ✅ Updated placeholder: "Username or Email"
- ✅ Icon changed from `email` to `person`
- ✅ Improved error messages

#### Behavior:
- System automatically detects if input is email (contains `@`) or username
- If username: looks up email from profiles table
- If email: proceeds with standard login
- Clear error messages for both scenarios

---

### 3. **Auth Service** (`src/lib/auth.ts`)

#### Sign Up Updates:
```typescript
static async signUp(
  email: string, 
  password: string, 
  displayName?: string, 
  username?: string  // NEW
)
```

**New Logic:**
1. Check username uniqueness before signup
2. Store username in auth metadata
3. Create profile with username and email
4. Username stored in lowercase
5. Throw specific error if username is taken

#### Sign In Updates:
```typescript
static async signIn(
  identifier: string,  // Can be username or email
  password: string
)
```

**New Logic:**
1. Detect if identifier is email or username
2. If username: lookup email from profiles table
3. Use email for Supabase authentication
4. Better error messages for invalid credentials

---

### 4. **Auth Store** (`src/store/authStore.ts`)

#### Updated Signatures:
```typescript
signIn: (identifier: string, password: string) => Promise<{ error: any }>;
signUp: (email: string, password: string, displayName?: string, username?: string) => Promise<{ error: any }>;
```

---

### 5. **Database Migration** (`db/migrations/002_add_username_support.sql`)

#### Schema Changes:
```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);

ALTER TABLE profiles
ADD CONSTRAINT username_lowercase CHECK (username = LOWER(username));
```

#### Why We Store Email in Profiles:
- Auth.users table cannot be queried from client
- Storing email in profiles enables username → email lookup
- This is a common denormalization pattern for performance

---

## User Flow

### Sign Up Flow:
```
1. User fills: Full Name, Username, Email, Password
   ↓
2. Validate username format
   ↓
3. Check username uniqueness
   ↓
4. Create auth.users record
   ↓
5. Create profiles record with username & email
   ↓
6. Success! User can now login with username or email
```

### Login Flow:
```
1. User enters: Username or Email + Password
   ↓
2. System detects input type (contains '@'?)
   ↓
3. If username: lookup email from profiles
   ↓
4. Authenticate with email + password
   ↓
5. Success! User logged in
```

---

## Error Handling

### Sign Up Errors:
- ❌ "Username must be between 3 and 20 characters"
- ❌ "Username can only contain letters, numbers, underscores, and periods"
- ❌ "Username must start with a letter or number"
- ❌ "Username is already taken"
- ❌ "Please fill in all fields"

### Login Errors:
- ❌ "Username not found. Please check your username or use your email to login."
- ❌ "Invalid username/email or password"
- ❌ "Please enter your username/email and password"

---

## Database Setup Required

### Run the migration:
```sql
-- Apply the migration
psql -h [your-host] -d [your-db] -U [your-user] -f db/migrations/002_add_username_support.sql
```

### Or manually in Supabase SQL Editor:
```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

ALTER TABLE profiles
ADD CONSTRAINT username_lowercase CHECK (username = LOWER(username));
```

---

## Testing Checklist

### Sign Up:
- [ ] Can create account with valid username
- [ ] Cannot use username < 3 characters
- [ ] Cannot use username > 20 characters
- [ ] Cannot use special characters (except _ and .)
- [ ] Cannot use duplicate username
- [ ] Username is stored in lowercase
- [ ] Error messages are clear

### Login:
- [ ] Can login with username
- [ ] Can login with email
- [ ] Username lookup works correctly
- [ ] Error message for invalid username
- [ ] Error message for wrong password
- [ ] Case-insensitive username login

### Profile Integration:
- [ ] Username displays in profile
- [ ] Username is searchable
- [ ] Username appears in sharing features
- [ ] Username visible in "My Friends" sections

---

## API Compatibility

### Supabase Profiles Table Schema:
```typescript
{
  id: uuid (FK to auth.users)
  display_name: text
  username: text (unique, lowercase)
  email: text
  avatar_url: text
  phone_number: text
  created_at: timestamp
}
```

### Indexes:
- `profiles_pkey` on `id`
- `idx_profiles_username` on `username` (NEW)
- `idx_profiles_email` on `email` (NEW)
- `profiles_username_key` unique constraint on `username` (NEW)

---

## Security Considerations

✅ **Username stored in lowercase** - prevents case-sensitivity issues
✅ **Unique constraint** - prevents duplicate usernames
✅ **Input validation** - prevents injection and invalid formats
✅ **Email still required** - maintains auth integrity
✅ **Profile lookup safe** - uses indexed columns for performance

---

## Future Enhancements

### Possible additions:
1. **Username availability checker** - real-time feedback during typing
2. **Username suggestions** - if desired username is taken
3. **Username change** - allow users to change username (with restrictions)
4. **Username search** - find friends by username
5. **@ mentions** - use @username for tagging in app
6. **Public profiles** - username-based profile URLs

---

## Rollback Plan

If needed, to rollback:

```sql
-- Remove columns
ALTER TABLE profiles
DROP COLUMN IF EXISTS username,
DROP COLUMN IF EXISTS email;

-- Drop indexes
DROP INDEX IF EXISTS idx_profiles_username;
DROP INDEX IF EXISTS idx_profiles_email;
```

Then revert code changes in the auth files.

---

## Summary

✅ **Sign Up**: Username field added with full validation
✅ **Login**: Username or email login supported
✅ **Backend**: Username stored and looked up efficiently
✅ **Database**: Schema updated with proper indexes and constraints
✅ **Security**: Input validation and uniqueness enforced
✅ **UX**: Clear error messages and intuitive flow

The authentication system now fully supports username-based signup and login! 🎉

