-- =========================================
-- TEK ADIMDA KAYIT SORUNUNU ÇÖZER
-- =========================================
-- Bu SQL'i Supabase SQL Editor'de çalıştırın
-- Tüm sorunları çözer: Trigger + RLS + Migration
-- =========================================

-- ADIM 1: Sütunları ekle
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ADIM 2: Username constraint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'username_lowercase') THEN
        ALTER TABLE profiles ADD CONSTRAINT username_lowercase CHECK (username = LOWER(username));
    END IF;
END $$;

-- ADIM 3: RLS Politikalarını düzelt
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON profiles FOR DELETE USING (auth.uid() = id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ADIM 4: OTOMATIK TRIGGER (EN ÖNEMLİ!)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, username, email, created_at)
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ADIM 5: Mevcut kullanıcıları migrate et
INSERT INTO public.profiles (id, email, display_name, created_at)
SELECT au.id, au.email, COALESCE(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)), au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ADIM 6: Mevcut kullanıcıya username ekle (DİKKAT: Email'inizi değiştirin!)
-- UPDATE profiles SET username = 'batu' WHERE email = 'diablobatuacar@hotmail.com';

-- KONTROL: Sonuçları gör
SELECT 
  au.email,
  p.username,
  p.display_name,
  CASE 
    WHEN p.id IS NULL THEN '❌ PROFİL YOK'
    WHEN p.username IS NULL THEN '⚠️ USERNAME EKSİK (normal)'
    ELSE '✅ TAM'
  END as durum
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
ORDER BY au.created_at DESC
LIMIT 5;

-- =========================================
-- BAŞARILI! ✅
-- =========================================
-- Şimdi:
-- 1. Yukarıdaki ADIM 6'daki UPDATE satırını açın (-- kaldırın)
-- 2. Email ve username'i kendinize göre değiştirin
-- 3. Tekrar RUN edin
-- 4. Uygulamadan çıkış yapıp username ile giriş yapın
-- =========================================

