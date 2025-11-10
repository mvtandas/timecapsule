-- ========================================
-- SUPABASE SQL EDITOR'DE BU KODU ÇALIŞTIR
-- ========================================
-- Bu kod profiles tablosuna eksik sütunları ekler
-- Hata: "Could not find the 'phone_number' column"
-- ========================================

-- 1. Eksik sütunları ekle
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 2. Index'leri oluştur (performans için)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 3. Username lowercase constraint ekle
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'username_lowercase'
    ) THEN
        ALTER TABLE profiles
        ADD CONSTRAINT username_lowercase CHECK (username = LOWER(username));
    END IF;
END $$;

-- 4. Mevcut kullanıcılar için email'leri senkronize et
UPDATE profiles
SET email = au.email
FROM auth.users au
WHERE profiles.id = au.id AND profiles.email IS NULL;

-- 5. Sonuçları kontrol et (bu sorgu sütunları gösterecek)
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- ========================================
-- BAŞARILI! ✅
-- Şimdi uygulamayı yeniden başlatın
-- ========================================

