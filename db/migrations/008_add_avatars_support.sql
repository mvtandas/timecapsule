-- Add avatar support for profiles

-- Storage policies for avatars bucket
-- Note: Bucket must be created manually in Supabase Dashboard first
-- Bucket name: "avatars"
-- Public: Yes

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 2. Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Allow public read access to all avatars
CREATE POLICY "Public read access to avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 4. Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

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

