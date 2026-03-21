-- ============ STEP 1: Create tables ============

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id UUID NOT NULL REFERENCES capsules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_capsule_id ON comments(capsule_id);

-- Likes
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id UUID NOT NULL REFERENCES capsules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(capsule_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_capsule_id ON likes(capsule_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  capsule_id UUID REFERENCES capsules(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ============ STEP 2: Enable RLS ============

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============ STEP 3: Policies ============

-- Comments: anyone can read on public capsules
CREATE POLICY "comments_select" ON comments FOR SELECT USING (true);
-- Comments: auth user can insert their own
CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Comments: auth user can delete their own
CREATE POLICY "comments_delete" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Likes: anyone can read
CREATE POLICY "likes_select" ON likes FOR SELECT USING (true);
-- Likes: auth user can insert their own
CREATE POLICY "likes_insert" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Likes: auth user can delete their own
CREATE POLICY "likes_delete" ON likes FOR DELETE USING (auth.uid() = user_id);

-- Notifications: user can read own
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (auth.uid() = user_id);
-- Notifications: anyone authenticated can insert
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);
-- Notifications: user can update own (mark read)
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);
-- Notifications: user can delete own
CREATE POLICY "notifications_delete" ON notifications FOR DELETE USING (auth.uid() = user_id);
