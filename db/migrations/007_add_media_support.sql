-- Add media_url and is_locked fields to capsules table
ALTER TABLE capsules 
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('image', 'video', 'none')),
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- Set default media_type to 'none' for existing records
UPDATE capsules SET media_type = 'none' WHERE media_type IS NULL;

-- Create storage bucket for capsule media (run this separately in Supabase Dashboard -> Storage)
-- Bucket name: capsules_media
-- Public: true (we'll control access via RLS)

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Storage policies for capsules_media bucket
-- 1. Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload capsule media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'capsules_media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 2. Allow users to view their own capsule media
CREATE POLICY "Users can view own capsule media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'capsules_media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Allow public read access to media from public capsules
CREATE POLICY "Public read access to public capsule media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'capsules_media' AND
  EXISTS (
    SELECT 1 FROM capsules
    WHERE media_url LIKE '%' || name || '%'
    AND is_public = true
  )
);

-- 4. Allow users to delete their own media
CREATE POLICY "Users can delete own capsule media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'capsules_media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Update view_count if not exists (from previous migration)
ALTER TABLE capsules 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create or replace the increment view count function
CREATE OR REPLACE FUNCTION increment_capsule_view_count(capsule_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE capsules 
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = capsule_uuid;
END;
$$;

