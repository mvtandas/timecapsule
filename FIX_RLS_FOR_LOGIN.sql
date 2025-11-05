-- =========================================
-- RLS POLİTİKALARINI DÜZELT - LOGIN İÇİN
-- =========================================
-- Problem: Username var ama app okuyamıyor
-- Sebep: RLS politikaları login sırasında erişimi engelliyor
-- Çözüm: Public okuma yetkisi ekle (sadece username lookup için)
-- =========================================

-- ADIM 1: Mevcut RLS politikalarını kontrol et
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles';

-- ADIM 2: Eski politikaları kaldır
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- ADIM 3: YENİ POLİTİKALAR (Login için gerekli!)
-- Username lookup için herkese okuma izni (login sırasında gerekli)
CREATE POLICY "Anyone can read profiles for username lookup"
  ON profiles FOR SELECT
  TO public
  USING (true);

-- Kullanıcılar sadece kendi profillerini ekleyebilir
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Kullanıcılar sadece kendi profillerini güncelleyebilir
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Kullanıcılar sadece kendi profillerini silebilir
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- RLS'i aktif et
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ADIM 4: Test et (login sırasında yapılan sorgu)
-- Bu sorgu MUTLAKA sonuç dönmeli!
SELECT email, username
FROM profiles
WHERE username = 'batu';

-- ADIM 5: Tüm kullanıcılar görünüyor mu kontrol et
SELECT 
  email,
  username,
  display_name
FROM profiles
ORDER BY created_at DESC;

-- =========================================
-- BAŞARILI! ✅
-- =========================================
-- Artık:
-- 1. Login sırasında username lookup çalışacak
-- 2. App profilleri okuyabilecek
-- 3. Kullanıcılar sadece kendi profillerini değiştirebilecek
--
-- ŞİMDİ YAPMANIZ GEREKEN:
-- 1. Uygulamayı tamamen kapatın
-- 2. Yeniden açın
-- 3. Username ile giriş yapın: batu + şifreniz
-- =========================================

