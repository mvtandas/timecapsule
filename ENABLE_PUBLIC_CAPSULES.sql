-- =====================================================
-- PUBLIC CAPSULES ACCESS - RLS POLICY UPDATE
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- This will allow all authenticated users to see public capsules
-- =====================================================

-- Step 1: Drop all existing capsule policies (clean slate)
DROP POLICY IF EXISTS "Users can view their own capsules" ON capsules;
DROP POLICY IF EXISTS "Users can view public capsules" ON capsules;
DROP POLICY IF EXISTS "Users can view shared capsules" ON capsules;
DROP POLICY IF EXISTS "capsules_select_policy" ON capsules;
DROP POLICY IF EXISTS "Users can view accessible capsules" ON capsules;
DROP POLICY IF EXISTS "Users can create their own capsules" ON capsules;
DROP POLICY IF EXISTS "Users can update their own capsules" ON capsules;
DROP POLICY IF EXISTS "Users can delete their own capsules" ON capsules;

-- Step 2: Create new comprehensive SELECT policy
-- This policy allows users to see:
-- ✅ Capsules they own
-- ✅ Public capsules (from any user)
-- ✅ Capsules shared with them
CREATE POLICY "Users can view accessible capsules"
ON capsules
FOR SELECT
TO authenticated
USING (
  -- Case 1: User owns the capsule
  auth.uid() = owner_id
  OR
  -- Case 2: Capsule is public (ANYONE can see it!)
  is_public = true
  OR
  -- Case 3: Capsule is shared with user
  EXISTS (
    SELECT 1 FROM shared_capsules
    WHERE shared_capsules.capsule_id = capsules.id
    AND shared_capsules.user_id = auth.uid()
  )
);

-- Step 3: Create INSERT policy (only owner can create)
CREATE POLICY "Users can create their own capsules"
ON capsules
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Step 4: Create UPDATE policy (only owner can update)
CREATE POLICY "Users can update their own capsules"
ON capsules
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Step 5: Create DELETE policy (only owner can delete)
CREATE POLICY "Users can delete their own capsules"
ON capsules
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- Step 6: Ensure RLS is enabled
ALTER TABLE capsules ENABLE ROW LEVEL SECURITY;

-- Step 7: Verify policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual 
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check 
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'capsules'
ORDER BY cmd, policyname;

-- =====================================================
-- EXPECTED OUTPUT:
-- =====================================================
-- You should see 4 policies:
-- 1. "Users can view accessible capsules" (SELECT)
-- 2. "Users can create their own capsules" (INSERT)
-- 3. "Users can update their own capsules" (UPDATE)
-- 4. "Users can delete their own capsules" (DELETE)
-- =====================================================

-- =====================================================
-- TEST QUERIES (Optional - to verify it works)
-- =====================================================

-- Test 1: Check current user
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_user_email;

-- Test 2: See all capsules you can access
SELECT 
  id,
  title,
  owner_id,
  is_public,
  CASE 
    WHEN owner_id = auth.uid() THEN '✅ You own this'
    WHEN is_public = true THEN '🌍 Public (visible to all)'
    ELSE '🔒 Shared with you'
  END as access_type,
  created_at
FROM capsules
ORDER BY created_at DESC;

-- Test 3: Count capsules by type
SELECT 
  COUNT(*) FILTER (WHERE owner_id = auth.uid()) as owned_by_me,
  COUNT(*) FILTER (WHERE is_public = true AND owner_id != auth.uid()) as public_from_others,
  COUNT(*) FILTER (WHERE is_public = false AND owner_id != auth.uid()) as shared_with_me,
  COUNT(*) as total_accessible
FROM capsules;

-- =====================================================
-- TESTING INSTRUCTIONS:
-- =====================================================
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Create a test public capsule:
--    - Log in as User A
--    - Create a capsule with is_public = true
-- 3. Log in as User B (different user)
-- 4. Open the app and check the map
-- 5. You should see User A's public capsule! ✅
-- =====================================================

