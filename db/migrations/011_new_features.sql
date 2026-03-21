-- ============ REACTIONS (replaces simple likes with emoji reactions) ============
ALTER TABLE likes ADD COLUMN IF NOT EXISTS reaction TEXT DEFAULT 'heart';

-- ============ CAPSULE CATEGORIES ============
ALTER TABLE capsules ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE capsules ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- ============ COLLABORATIVE CAPSULES ============
CREATE TABLE IF NOT EXISTS capsule_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id UUID NOT NULL REFERENCES capsules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(capsule_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_capsule_collaborators_capsule ON capsule_collaborators(capsule_id);
CREATE INDEX IF NOT EXISTS idx_capsule_collaborators_user ON capsule_collaborators(user_id);

ALTER TABLE capsule_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collab_select" ON capsule_collaborators FOR SELECT USING (true);
CREATE POLICY "collab_insert" ON capsule_collaborators FOR INSERT WITH CHECK (true);
CREATE POLICY "collab_delete" ON capsule_collaborators FOR DELETE USING (true);

-- ============ STREAKS ============
CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_capsule_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaks_select" ON streaks FOR SELECT USING (true);
CREATE POLICY "streaks_insert" ON streaks FOR INSERT WITH CHECK (true);
CREATE POLICY "streaks_update" ON streaks FOR UPDATE USING (true);

-- ============ CAPSULE CHAINS (reply capsules) ============
ALTER TABLE capsules ADD COLUMN IF NOT EXISTS parent_capsule_id UUID REFERENCES capsules(id) ON DELETE SET NULL;

-- ============ AUDIO SUPPORT ============
-- media_type already supports different types, just add 'audio'
-- No schema change needed, just allow 'audio' in media_type

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_capsules_category ON capsules(category);
CREATE INDEX IF NOT EXISTS idx_capsules_parent ON capsules(parent_capsule_id);
CREATE INDEX IF NOT EXISTS idx_capsules_created_at_desc ON capsules(created_at DESC);
