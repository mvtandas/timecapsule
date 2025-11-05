-- Add view_count to capsules table
ALTER TABLE capsules
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create index for sorting by view_count
CREATE INDEX IF NOT EXISTS capsules_view_count_idx ON capsules(view_count DESC);

-- Create a function to increment view count
CREATE OR REPLACE FUNCTION increment_capsule_view_count(capsule_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE capsules
  SET view_count = view_count + 1
  WHERE id = capsule_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION increment_capsule_view_count(UUID) TO authenticated;

