# Phone Number Sütun Hatası Düzeltme

## Hata
```
Could not find the 'phone_number' column of 'profiles' in the schema cache
```

## Neden Oluştu?
Veritabanı migration'ı henüz çalıştırılmadığı için `profiles` tablosunda `phone_number` sütunu yok.

## Çözüm

### Adım 1: Supabase SQL Editor'ü Aç
1. https://app.supabase.com adresine git
2. Projenizi seçin
3. Sol menüden **SQL Editor**'ü tıklayın

### Adım 2: Aşağıdaki SQL Kodunu Çalıştır

```sql
-- Add username, email, and phone_number columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Add constraint to ensure username is lowercase
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

-- Update existing profiles to add email from auth.users
UPDATE profiles
SET email = au.email
FROM auth.users au
WHERE profiles.id = au.id AND profiles.email IS NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

### Adım 3: SQL'i Çalıştır
1. SQL kodunu SQL Editor'e yapıştır
2. **Run** butonuna tıkla
3. Başarılı olduğunu doğrula (yeşil onay işareti görmelisin)

### Adım 4: Kontrol Et
En altta profil sütunlarını listeleyecek. Şunları görmeli:
- `id`
- `display_name`
- `username` ← YENİ
- `email` ← YENİ
- `phone_number` ← YENİ
- `avatar_url`
- `created_at`

### Adım 5: Uygulamayı Yeniden Başlat
1. Uygulamadan çık
2. Uygulamayı yeniden aç
3. Profile Settings'e git
4. Şimdi profil bilgilerini güncelleyebilmelisin!

---

## Alternatif: Tüm Yapıyı Sıfırdan Oluştur

Eğer yukarıdaki çözüm işe yaramazsa, profiles tablosunu yeniden oluştur:

```sql
-- UYARI: Bu tüm profil verilerini siler!
-- Sadece geliştirme ortamında kullan

DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  username TEXT UNIQUE,
  email TEXT,
  phone_number TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Constraints
ALTER TABLE profiles
ADD CONSTRAINT username_lowercase CHECK (username = LOWER(username));

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile"
ON profiles FOR DELETE
USING (auth.uid() = id);
```

---

## Hata Devam Ederse

### Schema Cache Temizle
Supabase Dashboard'da:
1. **Settings** → **Database** → **Connection pooling**
2. **Reset connection pooler** butonuna tıkla
3. 30 saniye bekle
4. Uygulamayı tekrar dene

### Supabase Client'ı Yenile
Uygulamada:
1. Uygulamayı tamamen kapat
2. Cihazı yeniden başlat (opsiyonel)
3. Uygulamayı aç
4. Tekrar giriş yap

---

## Özet

✅ **Sorun**: `phone_number` sütunu eksik  
✅ **Çözüm**: SQL migration'ı çalıştır  
✅ **Süre**: ~2 dakika  
✅ **Risk**: Düşük (IF NOT EXISTS kullanıldı)  

Bu adımları izledikten sonra profil güncelleme çalışacak! 🎉

