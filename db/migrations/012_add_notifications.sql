-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('private_capsule', 'friend_request', 'capsule_unlocked', 'system')),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  capsule_id UUID REFERENCES capsules(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_receiver_id ON notifications(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications

-- Users can only read their own notifications
CREATE POLICY "Users can read their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = receiver_id);

-- Users can insert notifications (for sender_id)
CREATE POLICY "Users can send notifications"
ON notifications FOR INSERT
WITH CHECK (
  auth.uid() = sender_id OR
  sender_id IS NULL -- Allow system notifications
);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
USING (auth.uid() = receiver_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notifications_updated_at_trigger
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION update_notifications_updated_at();

-- Add visibility column to capsules if it doesn't exist
-- This allows explicit 'public' or 'private' tagging
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'capsules' AND column_name = 'visibility') THEN
    ALTER TABLE capsules ADD COLUMN visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private'));
    
    -- Migrate existing data: set visibility based on is_public
    UPDATE capsules SET visibility = CASE WHEN is_public THEN 'public' ELSE 'private' END;
  END IF;
END $$;

COMMENT ON TABLE notifications IS 'Stores user notifications for various events';
COMMENT ON COLUMN notifications.type IS 'Type of notification: private_capsule, friend_request, capsule_unlocked, system';
COMMENT ON COLUMN notifications.read IS 'Whether the notification has been read by the receiver';

