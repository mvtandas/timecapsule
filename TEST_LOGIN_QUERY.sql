-- =========================================
-- LOGIN SORGUSU TEST
-- =========================================
-- Uygulamanın login sırasında yaptığı sorguları test et
-- =========================================

-- Test 1: Username ile email bulma (app bunu yapıyor)
SELECT 
  email,
  username,
  'SUCCESS - Email bulundu' as result
FROM profiles
WHERE username = 'batu';
-- Eğer boş dönüyorsa RLS engelliyor demektir!

-- Test 2: RLS politikalarını kontrol et
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '📖 Okuma'
    WHEN cmd = 'INSERT' THEN '➕ Ekleme'
    WHEN cmd = 'UPDATE' THEN '✏️ Güncelleme'
    WHEN cmd = 'DELETE' THEN '🗑️ Silme'
    ELSE cmd
  END as islem_tipi,
  CASE 
    WHEN policyname ILIKE '%public%' OR policyname ILIKE '%anyone%' THEN '✅ Herkes okuyabilir'
    WHEN policyname ILIKE '%own%' THEN '🔒 Sadece kendisi'
    ELSE '❓ Belirsiz'
  END as erisim
FROM pg_policies
WHERE tablename = 'profiles';

-- Test 3: Profil sayısı
SELECT 
  COUNT(*) as toplam_profil,
  COUNT(username) as username_olan,
  COUNT(email) as email_olan
FROM profiles;

-- Test 4: RLS aktif mi?
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS AKTİF'
    ELSE '❌ RLS KAPALI'
  END as rls_durumu
FROM pg_tables
WHERE tablename = 'profiles';

