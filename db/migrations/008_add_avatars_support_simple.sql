-- Add avatar support for profiles (Simple version - without storage policies)

-- Ensure avatar_url column exists in profiles table
-- (It should already exist from initial migration, but we'll ensure it)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- Make sure profiles table allows public read for avatars
-- This allows other users to see profile pictures
-- Drop policy if exists, then create
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public read access to profiles" ON profiles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Public read access to profiles"
ON profiles FOR SELECT
USING (true);

