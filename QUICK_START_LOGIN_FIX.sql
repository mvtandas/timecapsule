-- ========================================
-- HIZLI ÇÖZÜM: USERNAME LOGIN HATASI
-- ========================================
-- Bu SQL'i Supabase SQL Editor'de çalıştırın
-- Süre: ~30 saniye
-- ========================================

-- ADIM 1: Eksik sütunları ekle
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- ADIM 2: Index'leri oluştur
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ADIM 3: Username constraint (lowercase)
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

-- ADIM 4: ÖNEMLI - Mevcut kullanıcıların email'lerini doldur
UPDATE profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id 
  AND (p.email IS NULL OR p.email = '');

-- ADIM 5: Mevcut kullanıcınıza username atayın
-- ⚠️ EMAIL VE USERNAME DEĞERLERİNİ DEĞİŞTİRİN
UPDATE profiles
SET username = 'batu'  -- İstediğiniz username (3-20 karakter, küçük harf, rakam, _ )
WHERE email = 'diablobatuacar@hotmail.com';  -- Kendi email'iniz

-- KONTROL: Profilinizi görüntüleyin
SELECT 
    id,
    display_name,
    username,
    email,
    phone_number,
    created_at
FROM profiles
WHERE email = 'diablobatuacar@hotmail.com'  -- Kendi email'iniz
ORDER BY created_at DESC;

-- ========================================
-- BAŞARILI! ✅
-- ========================================
-- Şimdi yapmanız gerekenler:
-- 1. Uygulamadan çıkış yapın (Logout)
-- 2. Uygulamayı tamamen kapatın
-- 3. Yeniden açın
-- 4. Username ile giriş yapın: 'batu' + şifreniz
-- ========================================

