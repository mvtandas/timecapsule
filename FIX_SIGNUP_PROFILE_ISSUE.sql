-- ========================================
-- KAYIT SORUNU ÇÖZÜMÜ
-- ========================================
-- Problem: Kullanıcı kayıt oluyor ama profiles tablosuna kaydedilmiyor
-- Çözüm: Otomatik trigger + RLS politikaları
-- ========================================

-- ADIM 1: Önce eksik sütunları ekle (eğer yoksa)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Username lowercase constraint
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

-- ========================================
-- ADIM 2: RLS Politikalarını Düzelt
-- ========================================

-- Önce mevcut politikaları kaldır
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;

-- Yeni politikalar oluştur
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- RLS'i aktif et
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ADIM 3: OTOMATIK PROFIL OLUŞTURMA TRIGGER
-- ========================================

-- Önce mevcut trigger'ı kaldır (varsa)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Yeni kullanıcı oluşturulduğunda otomatik profil oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    username,
    email,
    created_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    LOWER(NEW.raw_user_meta_data->>'username'),
    NEW.email,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger'ı ekle
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- ADIM 4: Mevcut Kullanıcılar İçin Profil Oluştur
-- ========================================

-- Auth'da var ama profiles'da olmayan kullanıcıları ekle
INSERT INTO public.profiles (id, email, display_name, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)),
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- ADIM 5: Test ve Doğrulama
-- ========================================

-- Kullanıcıları kontrol et
SELECT 
  au.id,
  au.email as auth_email,
  au.created_at as auth_created_at,
  p.email as profile_email,
  p.username,
  p.display_name,
  CASE 
    WHEN p.id IS NULL THEN '❌ PROFİL YOK'
    WHEN p.email IS NULL THEN '⚠️ EMAIL EKSİK'
    WHEN p.username IS NULL THEN '⚠️ USERNAME EKSİK'
    ELSE '✅ TAM'
  END as durum
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
ORDER BY au.created_at DESC
LIMIT 10;

-- ========================================
-- BAŞARILI! ✅
-- ========================================
-- Artık:
-- 1. Yeni kullanıcılar otomatik olarak profiles'a eklenir
-- 2. Mevcut kullanıcılar da profiles'a eklendi
-- 3. RLS politikaları düzgün çalışıyor
--
-- Şimdi yapın:
-- 1. Uygulamadan yeni bir hesap oluşturun (test)
-- 2. Profiles tablosunda kayıt olup olmadığını kontrol edin
-- 3. Username ile giriş yapın
-- ========================================

