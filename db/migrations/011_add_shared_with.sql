-- Add shared_with column to capsules table for private capsule sharing
ALTER TABLE capsules 
ADD COLUMN IF NOT EXISTS shared_with UUID[] DEFAULT NULL;

-- Create index for faster queries on shared_with
CREATE INDEX IF NOT EXISTS idx_capsules_shared_with ON capsules USING GIN (shared_with);

-- Update RLS policy to include shared capsules
DROP POLICY IF EXISTS "Users can view accessible capsules" ON capsules;
CREATE POLICY "Users can view accessible capsules"
ON capsules FOR SELECT
USING (
  is_public = true OR 
  owner_id = auth.uid() OR 
  auth.uid() = ANY(shared_with)
);

-- Users can only update their own capsules
DROP POLICY IF EXISTS "Users can update own capsules" ON capsules;
CREATE POLICY "Users can update own capsules"
ON capsules FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Users can only delete their own capsules
DROP POLICY IF EXISTS "Users can delete own capsules" ON capsules;
CREATE POLICY "Users can delete own capsules"
ON capsules FOR DELETE
USING (owner_id = auth.uid());

