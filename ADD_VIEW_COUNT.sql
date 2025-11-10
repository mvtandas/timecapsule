-- ============================================
-- SUPABASE'DE ÇALIŞTIRIN
-- ============================================
-- Bu SQL'i Supabase SQL Editor'de çalıştırın
-- ============================================

-- 1. view_count column ekle
ALTER TABLE capsules
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 2. Index oluştur (sorting için)
CREATE INDEX IF NOT EXISTS capsules_view_count_idx ON capsules(view_count DESC);

-- 3. View count artırma function'ı
CREATE OR REPLACE FUNCTION increment_capsule_view_count(capsule_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE capsules
  SET view_count = view_count + 1
  WHERE id = capsule_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function için izin ver
GRANT EXECUTE ON FUNCTION increment_capsule_view_count(UUID) TO authenticated;

-- 5. Mevcut capsule'lar için rastgele view count atayalım (test için)
UPDATE capsules
SET view_count = FLOOR(RANDOM() * 100)
WHERE view_count = 0;

-- Başarılı! ✅

