# 🔧 Supabase Storage RLS Fix - Capsule Media Upload

## Hata
```
Error uploading media: new row violates row-level security policy
```

## Neden Oluyor?
Supabase Storage bucket'larında RLS politikaları eksik veya yanlış yapılandırılmış.

---

## ✅ Hızlı Çözüm

### Adım 1: Supabase Dashboard'a Git

1. **https://supabase.com** → Login
2. Projenizi seçin
3. Sol menüden **"Storage"** tıklayın

---

### Adım 2: Bucket'ları Kontrol Et

#### `capsules_media` Bucket'ı

1. **Storage** → **capsules_media** bucket'ını bul
2. Sağ üstteki **"⚙️" (Settings)** ikonuna tıkla
3. **"Public bucket"** seçeneğini **AÇIK** yap ✅
4. **Save** et

#### `avatars` Bucket'ı

1. **Storage** → **avatars** bucket'ını bul
2. Sağ üstteki **"⚙️" (Settings)** ikonuna tıkla
3. **"Public bucket"** seçeneğini **AÇIK** yap ✅
4. **Save** et

---

### Adım 3: Policies Ekle

#### `capsules_media` için Policies

**Storage** → **capsules_media** → **Policies** tab

**Policy 1: Upload Access**
```
Name: Allow authenticated users to upload
Type: INSERT
Target roles: authenticated
WITH CHECK expression: 
bucket_id = 'capsules_media' AND auth.uid()::text = (storage.foldername(name))[1]
```

**Policy 2: Read Access**
```
Name: Public read access
Type: SELECT
Target roles: public
USING expression:
bucket_id = 'capsules_media'
```

**Policy 3: Update Access**
```
Name: Allow users to update their own files
Type: UPDATE
Target roles: authenticated
USING expression:
bucket_id = 'capsules_media' AND auth.uid()::text = (storage.foldername(name))[1]
```

**Policy 4: Delete Access**
```
Name: Allow users to delete their own files
Type: DELETE
Target roles: authenticated
USING expression:
bucket_id = 'capsules_media' AND auth.uid()::text = (storage.foldername(name))[1]
```

---

#### `avatars` için Policies

**Storage** → **avatars** → **Policies** tab

**Policy 1: Upload Access**
```
Name: Allow authenticated users to upload avatars
Type: INSERT
Target roles: authenticated
WITH CHECK expression:
bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
```

**Policy 2: Read Access**
```
Name: Public read access to avatars
Type: SELECT
Target roles: public
USING expression:
bucket_id = 'avatars'
```

**Policy 3: Update Access**
```
Name: Allow users to update their own avatars
Type: UPDATE
Target roles: authenticated
USING expression:
bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
```

**Policy 4: Delete Access**
```
Name: Allow users to delete their own avatars
Type: DELETE
Target roles: authenticated
USING expression:
bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
```

---

## 🎯 Policy Açıklamaları

### Policy Formula
```
auth.uid()::text = (storage.foldername(name))[1]
```

Bu formula şu anlama gelir:
- `auth.uid()` = Giriş yapmış kullanıcının ID'si
- `storage.foldername(name)[1]` = Dosya yolundaki ilk klasör adı
- Kullanıcılar sadece kendi ID'leriyle adlandırılmış klasörlere upload yapabilir

**Örnek:**
- User ID: `abc-123-def`
- File path: `abc-123-def/capsule_media.jpg` ✅ İzin var
- File path: `xyz-456-ghi/capsule_media.jpg` ❌ İzin yok

---

## 📱 Test Et

### Test Senaryosu

1. **Kapsül Oluştur**
   - Dashboard → "+" butonu
   - Fotoğraf ekle
   - Detayları doldur
   - Kaydet

2. **Kontrol**
   - ✅ "Error uploading media" ÇIKMAMALI
   - ✅ Fotoğraf başarıyla yüklenmeli
   - ✅ Kapsül oluşturulmalı

3. **Console Logları**
   ```
   📥 Fetching file...
   🔄 Converting blob to base64...
   ✅ Base64 length: 123456
   🔄 Converting to Uint8Array...
   ✅ Uint8Array size: 123456
   ✅ Media uploaded successfully: https://...
   ```

---

## 🐛 Hala Sorun Varsa

### Alternatif Çözüm: Bucket'ı Yeniden Oluştur

1. **Storage** → **capsules_media** → Delete bucket
2. **Create a new bucket**
   - Name: `capsules_media`
   - **Public bucket: ON** ✅
   - Create

3. Yukarıdaki policies'i ekle

---

## ✅ Checklist

- [ ] `capsules_media` bucket public yapıldı
- [ ] `capsules_media` policies eklendi (4 adet)
- [ ] `avatars` bucket public yapıldı
- [ ] `avatars` policies eklendi (4 adet)
- [ ] Uygulama yenilendi (Shake + Reload)
- [ ] Kapsül upload testi yapıldı
- [ ] Hata giderildi ✅

---

**Bu adımları takip et ve sorun çözülecek!** 🚀

