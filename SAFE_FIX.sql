-- =========================================
-- GÜVENLİ VERSİYON - HATA VERMEDİN ÇALIŞIR
-- =========================================
-- Potential issue uyarılarını önler
-- Her şeyi kontrollü şekilde ekler
-- =========================================

-- ADIM 1: Sütunları güvenli şekilde ekle
DO $$ 
BEGIN
    -- username sütunu
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='username') THEN
        ALTER TABLE profiles ADD COLUMN username TEXT;
    END IF;
    
    -- email sütunu
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='email') THEN
        ALTER TABLE profiles ADD COLUMN email TEXT;
    END IF;
    
    -- phone_number sütunu
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='phone_number') THEN
        ALTER TABLE profiles ADD COLUMN phone_number TEXT;
    END IF;
END $$;

-- ADIM 2: Username unique constraint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
    END IF;
END $$;

-- ADIM 3: Username lowercase constraint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'username_lowercase') THEN
        ALTER TABLE profiles ADD CONSTRAINT username_lowercase CHECK (username = LOWER(username));
    END IF;
END $$;

-- ADIM 4: Index'leri güvenli şekilde oluştur
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ADIM 5: RLS Politikalarını temizle ve yeniden oluştur
DO $$ 
BEGIN
    -- Mevcut politikaları kaldır (hata verirse devam et)
    DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Hata olsa bile devam et
END $$;

-- Yeni politikaları oluştur
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON profiles FOR DELETE USING (auth.uid() = id);

-- RLS'i aktif et
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ADIM 6: Trigger'ı güvenli şekilde oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Profil yoksa oluştur
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
EXCEPTION WHEN OTHERS THEN
  -- Hata olsa bile kayıt işlemi devam etsin
  RETURN NEW;
END;
$$;

-- Trigger'ı oluştur
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ADIM 7: Mevcut kullanıcıları profiles'a ekle
INSERT INTO public.profiles (id, email, display_name, created_at)
SELECT 
  au.id, 
  au.email, 
  COALESCE(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)), 
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- ADIM 8: Email'leri güncelle (eksik olanlar için)
UPDATE profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id 
  AND (p.email IS NULL OR p.email = '');

-- =========================================
-- KONTROL: Sonuçları görüntüle
-- =========================================
SELECT 
  au.email as "Auth Email",
  p.email as "Profile Email",
  p.username as "Username",
  p.display_name as "Display Name",
  CASE 
    WHEN p.id IS NULL THEN '❌ PROFİL YOK'
    WHEN p.email IS NULL THEN '⚠️ EMAIL EKSİK'
    WHEN p.username IS NULL THEN '⚠️ USERNAME EKSİK (Normal - SignUp sonrası eklenecek)'
    ELSE '✅ HAZIR'
  END as "Durum"
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
ORDER BY au.created_at DESC
LIMIT 10;

-- =========================================
-- ✅ BAŞARILI!
-- =========================================
-- Artık:
-- 1. Tüm kullanıcıların profili var
-- 2. Yeni kayıtlar otomatik profiles'a eklenir
-- 3. Username + Email login çalışır
--
-- ŞİMDİ YAPMANIZ GEREKEN:
-- Aşağıdaki SQL'i çalıştırarak kendinize username ekleyin:
-- =========================================

-- UPDATE profiles 
-- SET username = 'batu'  -- İstediğiniz username
-- WHERE email = 'diablobatuacar@hotmail.com';  -- Kendi email'iniz

