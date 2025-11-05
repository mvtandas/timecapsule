-- =========================================
-- USERNAME SORUNUNU TEŞPİT ET VE ÇÖZEREK
-- =========================================

-- ADIM 1: Mevcut durumu kontrol et
SELECT 
  id,
  email,
  username,
  display_name,
  LENGTH(username) as username_uzunlugu,
  LENGTH(TRIM(username)) as bosluksuz_uzunluk
FROM profiles
WHERE email = 'diablobatuacar@hotmail.com';

-- ADIM 2: Tüm kullanıcıları kontrol et (username çakışması var mı?)
SELECT 
  email,
  username,
  created_at
FROM profiles
WHERE username IS NOT NULL
ORDER BY created_at DESC;

-- ADIM 3: Auth users ile karşılaştır
SELECT 
  au.email as auth_email,
  p.email as profile_email,
  p.username,
  CASE 
    WHEN p.id IS NULL THEN 'PROFIL YOK'
    WHEN p.email IS NULL THEN 'EMAIL EKSIK'
    WHEN p.username IS NULL THEN 'USERNAME EKSIK'
    ELSE 'TAMAM'
  END as durum
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
ORDER BY au.created_at DESC;

