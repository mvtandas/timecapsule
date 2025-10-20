# Profile Foreign Key Hatası - Kesin Çözüm

## 🐛 Sorun:
```
Error creating capsule: {"code": "23503", "details": "Key is not present in table \"profiles\".", ...}
```

Bu hata, capsule oluşturulurken `owner_id`'nin `profiles` tablosunda bulunamaması demek.

---

## ✅ ÇÖZÜM ADIMLARI:

### 1️⃣ Mevcut Kullanıcılar İçin Profile Oluşturun

**Supabase Dashboard** → **SQL Editor** → **New Query**

Bu SQL'i çalıştırın:

```sql
-- Tüm auth.users için profile oluştur (yoksa)
INSERT INTO profiles (id, display_name, created_at)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'display_name', email, 'User'),
  NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;
```

Bu SQL:
- ✅ Tüm mevcut kullanıcılar için profile oluşturur
- ✅ Zaten varsa atlar (conflict yapmaz)
- ✅ Display name'i metadata'dan veya email'den alır

---

### 2️⃣ Otomatik Profile Oluşturma (Database Trigger)

**Supabase Dashboard** → **SQL Editor** → **New Query**

Bu SQL'i çalıştırın:

```sql
-- Function: Yeni kullanıcı oluştuğunda otomatik profile ekle
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email, 'User'),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auth.users'da yeni kullanıcı oluştuğunda çalışsın
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

Bu trigger:
- ✅ Her yeni signup'ta otomatik profile oluşturur
- ✅ Artık hiçbir zaman foreign key hatası olmaz
- ✅ Gelecekteki tüm kullanıcılar için çalışır

---

### 3️⃣ Test Edin

1. **Mevcut kullanıcıyla:**
   - Şimdi kapsül oluşturun
   - Çalışmalı! ✅

2. **Yeni kullanıcıyla:**
   - Yeni hesap oluşturun
   - Kapsül oluşturun
   - Çalışmalı! ✅

---

## 🔍 Kontrol:

**Profil oluşturuldu mu kontrol edin:**

```sql
-- Profili olmayan kullanıcıları göster
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;
```

Boş sonuç = Herkesin profili var ✅

---

## 🚨 HIZLI TEST:

Eğer hala çalışmazsa:

1. **Logout yapın**
2. **Login yapın**
3. **Tekrar deneyin**

Uygulama kodu artık her durumda profile oluşturacak şekilde güncellendi!

