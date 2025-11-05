# Username Login Hatası - Çözüm Rehberi

## ❌ Hata
```
Login Failed
Username not found. Please check your username or use your email to login.
```

## 🎯 Çözüm Adımları

### ADIM 1: Supabase SQL Migration'ı Çalıştır

1. **Supabase Dashboard'a git**: https://app.supabase.com
2. **SQL Editor'ü aç**: Sol menüden "SQL Editor" → "New Query"
3. **Aşağıdaki SQL kodunu yapıştır ve RUN butonuna tıkla**:

```sql
-- ========================================
-- PROFILES TABLOSUNU GÜNCELLE
-- ========================================

-- 1. Eksik sütunları ekle
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 2. Index'leri oluştur (hızlı arama için)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 3. Username lowercase constraint
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

-- 4. ÇÖZÜM: Mevcut kullanıcılar için email'leri otomatik doldur
UPDATE profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id AND (p.email IS NULL OR p.email = '');

-- 5. Kontrol: Profilleri görüntüle
SELECT 
    id, 
    display_name, 
    username, 
    email, 
    phone_number,
    created_at
FROM profiles
ORDER BY created_at DESC;
```

### ADIM 2: Kullanıcı Hesabınıza Username Ekleyin

Migration çalıştıktan sonra, **mevcut hesabınız için username belirleyin**:

#### Seçenek A: SQL ile (Hızlı)
```sql
-- YOUR_USER_ID'yi kendi user ID'nizle değiştirin
-- YOUR_USERNAME'i istediğiniz username ile değiştirin

UPDATE profiles
SET username = 'batu'  -- İstediğiniz username
WHERE email = 'diablobatuacar@hotmail.com';  -- Kendi emailiniz

-- Kontrol et
SELECT id, email, username FROM profiles WHERE email = 'diablobatuacar@hotmail.com';
```

#### Seçenek B: App üzerinden (Güvenli)
1. **Email ile giriş yapın**: Şu an için email kullanın
   - Email: `diablobatuacar@hotmail.com`
   - Şifreniz
2. **Profile Settings'e gidin**
3. **Username ekleyin**: `batu` veya başka bir username
4. **Save Changes**
5. Çıkış yapın ve tekrar username ile giriş deneyin

### ADIM 3: Test Et

1. **Uygulamadan çıkış yapın** (Logout)
2. **Uygulamayı tamamen kapatın**
3. **Yeniden açın**
4. **Username ile giriş yapmayı deneyin**:
   - Username: `batu`
   - Password: [şifreniz]
5. ✅ Başarılı!

---

## 🔍 Troubleshooting

### Hata 1: "Username not found"
**Sebep**: Profile'da username henüz yok  
**Çözüm**: Önce email ile giriş yapın, sonra Profile'dan username ekleyin

### Hata 2: "Could not find the 'phone_number' column"
**Sebep**: Migration tamamen çalışmadı  
**Çözüm**: ADIM 1'deki SQL'i tekrar çalıştırın

### Hata 3: "Username already taken"
**Sebep**: O username başkası tarafından kullanılıyor  
**Çözüm**: Farklı bir username seçin

### Hata 4: Email ile de giriş yapamıyorum
**Sebep**: Şifre yanlış veya hesap onaylanmamış  
**Çözüm**: 
1. "Forgot Password" ile şifre sıfırlayın
2. Email'inizdeki onay linkine tıklayın
3. Tekrar deneyin

---

## 📊 Nasıl Çalışıyor?

### Login Akışı:

1. **Kullanıcı giriş yapar**:
   - `batu` (username) VEYA `diablobatuacar@hotmail.com` (email)

2. **Sistem kontrol eder**:
   ```typescript
   if (identifier.includes('@')) {
     // Email ile giriş
     email = identifier;
   } else {
     // Username ile giriş - email'i profiles tablosundan çek
     const profile = await supabase
       .from('profiles')
       .select('email')
       .eq('username', identifier.toLowerCase())
       .single();
     
     email = profile.email;
   }
   ```

3. **Supabase Auth ile giriş**:
   ```typescript
   await supabase.auth.signInWithPassword({ email, password })
   ```

---

## ✅ Başarı Kontrol Listesi

- [ ] SQL migration çalıştırıldı
- [ ] `profiles` tablosunda `username`, `email`, `phone_number` sütunları var
- [ ] Mevcut kullanıcıların `email` sütunu dolduruldu
- [ ] Kendi kullanıcınıza `username` atandı
- [ ] Uygulamadan çıkış yapıldı ve yeniden açıldı
- [ ] Username ile giriş yapıldı ✨

---

## 🎯 Özet

| Özellik | Durum |
|---------|-------|
| ✅ Email ile login | Çalışıyor |
| ✅ Username ile login | Migration sonrası çalışacak |
| ✅ Profile güncelleme | Çalışıyor |
| ✅ Username uniqueness | Kontrol ediliyor |
| ✅ Case insensitive | Evet (lowercase) |

---

## 🚀 Sonraki Adımlar

1. ✅ SQL migration'ı çalıştır (5 dakika)
2. ✅ Email ile giriş yap
3. ✅ Profile'a username ekle
4. ✅ Çıkış yap
5. ✅ Username ile giriş yap
6. 🎉 Başarılı!

Migration'ı çalıştırdıktan sonra her şey sorunsuz çalışacak!

