-- Add media_url and is_locked fields to capsules table
ALTER TABLE capsules 
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('image', 'video', 'none')),
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- Set default media_type to 'none' for existing records
UPDATE capsules SET media_type = 'none' WHERE media_type IS NULL;

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

