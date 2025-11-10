# Kayıt Olma Sorunu - Hızlı Çözüm

## 🔴 Sorun
- Kayıt olurken kullanıcı `auth.users` tablosuna kaydediliyor
- Ama `profiles` tablosuna kaydedilmiyor
- Bu yüzden username ile giriş yapılamıyor
- Login sırasında "Username not found" hatası alınıyor

## ✅ Çözüm

### ADIM 1: Supabase SQL Çalıştır

1. **Supabase Dashboard'a git**: https://app.supabase.com
2. **SQL Editor'ü aç**: Sol menü → SQL Editor → New Query
3. **Aşağıdaki SQL'i çalıştır**:

Dosya: `FIX_SIGNUP_PROFILE_ISSUE.sql` içeriğini kopyala ve çalıştır.

**VEYA** bu kısa SQL'i kullan:

```sql
-- 1. Eksik sütunları ekle
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 2. Index'ler
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 3. RLS Politikalarını düzelt
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. OTOMATIK TRIGGER (En Önemli!)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Mevcut kullanıcılar için profil oluştur
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
```

### ADIM 2: Mevcut Kullanıcıya Username Ekle

SQL çalıştıktan sonra, **mevcut hesabınıza username atayın**:

```sql
-- Email'inizi ve istediğiniz username'i girin
UPDATE profiles
SET username = 'batu'  -- İstediğiniz username
WHERE email = 'diablobatuacar@hotmail.com';  -- Kendi email'iniz
```

### ADIM 3: Test Et

1. **Mevcut Hesapla Test**:
   - Uygulamadan çıkış yapın
   - Username ile giriş yapın: `batu` + şifreniz
   - ✅ Başarılı olmalı

2. **Yeni Hesap Oluşturarak Test**:
   - "Sign Up" butonuna tıklayın
   - Email, Username, Password girin
   - Kayıt olun
   - Artık profiles tablosuna otomatik eklenecek!
   - Username ile giriş yapabileceksiniz

---

## 🔍 Doğrulama

Supabase'de kontrol edin:

```sql
-- Auth'daki kullanıcılar vs Profiles'daki kullanıcılar
SELECT 
  au.email as auth_email,
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
ORDER BY au.created_at DESC;
```

Her kullanıcı için **"✅ TAM"** veya en azından profil olmalı.

---

## 🎯 Ne Değişti?

### Öncesi:
1. Kullanıcı kayıt olur
2. `auth.users` tablosuna eklenir
3. App `profiles` tablosuna eklemeye çalışır
4. **RLS politikası veya timing hatası yüzünden başarısız olur** ❌
5. Username bilgisi kaybolur
6. Login yapılamaz

### Sonrası:
1. Kullanıcı kayıt olur
2. `auth.users` tablosuna eklenir
3. **🔥 TRIGGER otomatik olarak `profiles` tablosuna ekler**
4. Email ve username kaydedilir ✅
5. Login sorunsuz çalışır

---

## 🚨 Olası Sorunlar

### Sorun 1: "permission denied for table profiles"
**Çözüm**: SQL'in başındaki RLS politikalarını tekrar çalıştırın

### Sorun 2: Trigger çalışmıyor
**Kontrol**:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```
Boş dönerse trigger yok, tekrar oluşturun.

### Sorun 3: Yeni kullanıcı username olmadan kaydoldu
**Çözüm**:
```sql
UPDATE profiles
SET username = 'yeni_username'
WHERE id = 'user_id_buraya';
```

---

## 📋 Özet

| Durum | Açıklama |
|-------|----------|
| ✅ **SQL çalıştırıldı** | Trigger ve RLS düzenlendi |
| ✅ **Mevcut kullanıcılar** | Profiles'a eklendi |
| ✅ **Yeni kullanıcılar** | Otomatik profile eklenir |
| ✅ **Username login** | Çalışır |
| ✅ **Email login** | Çalışır |

---

## 🎉 Başarı Testi

Terminal'de test:
```sql
-- Test 1: Trigger var mı?
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Test 2: Her kullanıcının profili var mı?
SELECT COUNT(*) as auth_users FROM auth.users;
SELECT COUNT(*) as profile_users FROM profiles;
-- Bu iki sayı eşit olmalı!

-- Test 3: RLS politikaları var mı?
SELECT polname FROM pg_policy WHERE tablename = 'profiles';
```

Hepsinden sonuç geliyorsa ✅ Başarılı!

Şimdi SQL'i çalıştırın ve sonucu bana bildirin! 🚀

