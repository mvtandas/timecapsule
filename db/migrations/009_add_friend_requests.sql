-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate requests
  UNIQUE(sender_id, receiver_id)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

-- Enable Row Level Security
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sent and received requests
DROP POLICY IF EXISTS "Users can view their own friend requests" ON friend_requests;
CREATE POLICY "Users can view their own friend requests"
ON friend_requests FOR SELECT
USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Policy: Users can send friend requests
DROP POLICY IF EXISTS "Users can send friend requests" ON friend_requests;
CREATE POLICY "Users can send friend requests"
ON friend_requests FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND 
  sender_id != receiver_id -- Can't send request to yourself
);

-- Policy: Users can update requests they received (accept/reject)
DROP POLICY IF EXISTS "Users can update received requests" ON friend_requests;
CREATE POLICY "Users can update received requests"
ON friend_requests FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- Policy: Users can delete their own sent requests (cancel) or unfriend
DROP POLICY IF EXISTS "Users can delete their sent requests" ON friend_requests;
CREATE POLICY "Users can delete their sent requests"
ON friend_requests FOR DELETE
USING (
  auth.uid() = sender_id OR 
  (auth.uid() = receiver_id AND status = 'accepted') OR
  (auth.uid() = sender_id AND status = 'accepted')
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_friend_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_friend_requests_updated_at_trigger ON friend_requests;
CREATE TRIGGER update_friend_requests_updated_at_trigger
BEFORE UPDATE ON friend_requests
FOR EACH ROW
EXECUTE FUNCTION update_friend_requests_updated_at();

