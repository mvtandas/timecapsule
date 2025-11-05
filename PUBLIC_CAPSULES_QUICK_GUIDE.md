# Public Capsules - Quick Setup Guide

## 🎯 What Was Fixed

**Problem**: Users could only see their own capsules. Public capsules were invisible.

**Solution**: 
- ✅ Updated app code to fetch public capsules
- ✅ Created database policies to allow public capsule access

---

## ⚡ Quick Setup (3 Steps)

### Step 1: Code Changes ✅ DONE
The app code has been updated automatically. No action needed!

### Step 2: Run SQL in Supabase ⚠️ ACTION REQUIRED

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste this SQL:

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own capsules" ON capsules;
DROP POLICY IF EXISTS "Users can view public capsules" ON capsules;
DROP POLICY IF EXISTS "Users can view shared capsules" ON capsules;
DROP POLICY IF EXISTS "capsules_select_policy" ON capsules;
DROP POLICY IF EXISTS "Users can view accessible capsules" ON capsules;
DROP POLICY IF EXISTS "Users can create their own capsules" ON capsules;
DROP POLICY IF EXISTS "Users can update their own capsules" ON capsules;
DROP POLICY IF EXISTS "Users can delete their own capsules" ON capsules;

-- Create new policy: View accessible capsules
CREATE POLICY "Users can view accessible capsules"
ON capsules FOR SELECT TO authenticated
USING (
  auth.uid() = owner_id OR is_public = true OR
  EXISTS (
    SELECT 1 FROM shared_capsules
    WHERE shared_capsules.capsule_id = capsules.id
    AND shared_capsules.user_id = auth.uid()
  )
);

-- Create new policy: Create capsules
CREATE POLICY "Users can create their own capsules"
ON capsules FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Create new policy: Update capsules
CREATE POLICY "Users can update their own capsules"
ON capsules FOR UPDATE TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Create new policy: Delete capsules
CREATE POLICY "Users can delete their own capsules"
ON capsules FOR DELETE TO authenticated
USING (auth.uid() = owner_id);

-- Enable RLS
ALTER TABLE capsules ENABLE ROW LEVEL SECURITY;
```

3. Click **Run**
4. ✅ Success! You should see "Success. No rows returned"

---

### Step 3: Test ✅

**Test A: Create Public Capsule**
1. Log in as User A
2. Create a capsule
3. Make sure `is_public` is checked/enabled
4. Drop it on the map

**Test B: View from Another User**
1. Log out
2. Log in as User B (different account)
3. Open the map
4. **You should see User A's public capsule!** ✅

---

## 🎯 What Users Will See

### User A (Capsule Owner):
```
Map View:
- 📍 My Private Capsule (only me)
- 🌍 My Public Capsule (everyone)
- 🌍 Other public capsules (from B, C, etc.)
```

### User B (Other User):
```
Map View:
- 📍 My Capsules (my own)
- 🌍 A's Public Capsule ✅ (NEW!)
- 🌍 C's Public Capsule ✅ (NEW!)
- ❌ A's Private Capsule (hidden)
```

---

## 🐛 Troubleshooting

### Still can't see public capsules?

**Quick Check:**
```sql
-- Run in Supabase SQL Editor:
SELECT id, title, owner_id, is_public FROM capsules;
```

Ensure `is_public` = `true` for test capsules.

**Verify RLS Policies:**
```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'capsules';
```

You should see 4 policies:
- `Users can view accessible capsules` (SELECT)
- `Users can create their own capsules` (INSERT)
- `Users can update their own capsules` (UPDATE)
- `Users can delete their own capsules` (DELETE)

---

## ✅ That's It!

**Summary:**
1. ✅ Code updated (automatic)
2. ⚠️ **Run SQL in Supabase** (manual - required!)
3. ✅ Test with different users

**Result:**
🎉 All users can now discover and view public capsules! 🌍

---

## 📁 Related Files

- **Full Guide**: `PUBLIC_CAPSULES_IMPLEMENTATION.md`
- **SQL File**: `ENABLE_PUBLIC_CAPSULES.sql`
- **Migration**: `db/migrations/004_enable_public_capsule_access.sql`
- **Code Changes**: 
  - `src/services/capsuleService.ts` (new method added)
  - `src/screens/dashboard/DashboardScreen.tsx` (updated to use new method)

