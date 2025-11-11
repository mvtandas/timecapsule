-- Create profile_visits table to track when users view each other's profiles
CREATE TABLE IF NOT EXISTS profile_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent self-visits and ensure one record per viewer-viewed pair
  UNIQUE(viewer_id, viewed_user_id),
  CHECK (viewer_id != viewed_user_id)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profile_visits_viewer ON profile_visits(viewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_visits_viewed_user ON profile_visits(viewed_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_visits_visited_at ON profile_visits(visited_at);

-- Enable Row Level Security
ALTER TABLE profile_visits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own visit history
DROP POLICY IF EXISTS "Users can view their own visit history" ON profile_visits;
CREATE POLICY "Users can view their own visit history"
ON profile_visits FOR SELECT
USING (auth.uid() = viewer_id);

-- Policy: Users can track their own visits
DROP POLICY IF EXISTS "Users can insert their own visits" ON profile_visits;
CREATE POLICY "Users can insert their own visits"
ON profile_visits FOR INSERT
WITH CHECK (
  auth.uid() = viewer_id AND 
  viewer_id != viewed_user_id
);

-- Policy: Users can update their own visit timestamps
DROP POLICY IF EXISTS "Users can update their own visits" ON profile_visits;
CREATE POLICY "Users can update their own visits"
ON profile_visits FOR UPDATE
USING (auth.uid() = viewer_id)
WITH CHECK (auth.uid() = viewer_id);

-- Policy: Users can delete their own visit history
DROP POLICY IF EXISTS "Users can delete their own visits" ON profile_visits;
CREATE POLICY "Users can delete their own visits"
ON profile_visits FOR DELETE
USING (auth.uid() = viewer_id);

-- Function to update visited_at timestamp
CREATE OR REPLACE FUNCTION update_profile_visits_visited_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.visited_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update visited_at on update
DROP TRIGGER IF EXISTS update_profile_visits_visited_at_trigger ON profile_visits;
CREATE TRIGGER update_profile_visits_visited_at_trigger
BEFORE UPDATE ON profile_visits
FOR EACH ROW
EXECUTE FUNCTION update_profile_visits_visited_at();

