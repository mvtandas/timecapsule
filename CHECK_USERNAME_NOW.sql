-- HIZLI KONTROL VE DÜZELTME

-- 1. Sizin profilinizi görelim
SELECT 
  id,
  email,
  username,
  display_name,
  created_at
FROM profiles
WHERE email ILIKE '%diablobatuacar%'
   OR email ILIKE '%hotmail%';

-- 2. Tüm profilleri görelim (kaç tane var?)
SELECT 
  email,
  username,
  display_name
FROM profiles
ORDER BY created_at DESC;

-- 3. Auth users ile eşleşiyor mu?
SELECT 
  au.id,
  au.email as auth_email,
  p.email as profile_email,
  p.username,
  CASE 
    WHEN p.id IS NULL THEN 'PROFIL YOK - SORUN!'
    WHEN p.email IS NULL THEN 'EMAIL YOK - SORUN!'
    WHEN p.username IS NULL THEN 'USERNAME YOK - NORMAL'
    ELSE 'TAMAM'
  END as durum
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id;

-- 4. Login test (uygulama bunu yapıyor)
SELECT 
  email,
  username
FROM profiles
WHERE username = 'batu';
-- Eğer boş dönüyorsa, username kaydedilmemiş demektir!

