-- Migration: Enable Public Capsule Access
-- Description: Update RLS policies to allow all authenticated users to view public capsules

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own capsules" ON capsules;
DROP POLICY IF EXISTS "Users can view public capsules" ON capsules;
DROP POLICY IF EXISTS "Users can view shared capsules" ON capsules;
DROP POLICY IF EXISTS "capsules_select_policy" ON capsules;

-- Create comprehensive SELECT policy for capsules
-- This allows users to see:
-- 1. Capsules they own (owner_id = auth.uid())
-- 2. Public capsules (is_public = true)
-- 3. Capsules shared with them (via shared_capsules table)
CREATE POLICY "Users can view accessible capsules"
ON capsules
FOR SELECT
TO authenticated
USING (
  -- User owns the capsule
  auth.uid() = owner_id
  OR
  -- Capsule is public
  is_public = true
  OR
  -- Capsule is shared with user (via shared_capsules table)
  EXISTS (
    SELECT 1 FROM shared_capsules
    WHERE shared_capsules.capsule_id = capsules.id
    AND shared_capsules.user_id = auth.uid()
  )
);

-- Policy for INSERT (only owner can create)
DROP POLICY IF EXISTS "Users can create their own capsules" ON capsules;
CREATE POLICY "Users can create their own capsules"
ON capsules
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Policy for UPDATE (only owner can update)
DROP POLICY IF EXISTS "Users can update their own capsules" ON capsules;
CREATE POLICY "Users can update their own capsules"
ON capsules
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Policy for DELETE (only owner can delete)
DROP POLICY IF EXISTS "Users can delete their own capsules" ON capsules;
CREATE POLICY "Users can delete their own capsules"
ON capsules
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- Ensure RLS is enabled on capsules table
ALTER TABLE capsules ENABLE ROW LEVEL SECURITY;

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'capsules'
ORDER BY policyname;

