# Voorcap — App Store: Mevcut Durum & Yapılacaklar

Bu dosya, App Store'a çıkış için nerede olduğumuzu ve kalan adımları özetler.
Kod + veritabanı tarafı bitti; kalanlar Apple/Google konsol işleri ve build.

Detaylı rehberler: [SUBMISSION.md](./SUBMISSION.md) · [social-login-setup.md](./social-login-setup.md) · [metadata.md](./metadata.md) · [privacy.md](./privacy.md)

---

## ✅ Bitti — Kod (main'de, commit `87e7a39f`)
- **Sosyal giriş:** Apple (native `expo-apple-authentication`) + Google (Supabase OAuth web flow). Buton bileşeni Welcome / Login / Signup ekranlarında.
- **Şifre sıfırlama:** deep-link ile açılan "yeni şifre belirle" ekranı + handler.
- **Safety (Guideline 1.2):** raporlama (+ "Criminal Activity" sebebi), kullanıcı engelleme, **Blocked Users** yönetim ekranı, Help & Support → `mailto:support@voorcap.app`.
- **eas.json** (development / preview / production + submit profilleri).
- **Bundle ID:** `com.voorcap.app` (iOS + Android).

## ✅ Bitti — Veritabanı
- Migration **`db/migrations/0012_report_block.sql`** Supabase SQL editöründe **çalıştırıldı**; `reports` + `blocked_users` tabloları canlı, RLS kullanıcı-bazlı. (Bu olmadan raporlama/engelleme sessizce çalışmıyordu — düzeltildi.)

## ✅ Bitti — Konsol ayarları
- **Supabase → Apple provider:** enabled, Client IDs = `com.voorcap.app` (native akış; Secret Key boş).
- **Supabase → Google provider:** enabled, Google Web Client ID + Secret girildi.
- **Google Cloud:** OAuth consent screen (External) + Web OAuth client oluşturuldu (redirect URI = Supabase callback).

---

## ⏳ Yapılacaklar (arkadaşın)

### 1. Supabase — son kontrol
Authentication → **URL Configuration → Redirect URLs** allow-list'te bunlar olmalı:
```
voorcap://auth/callback
voorcap://auth/reset-password
voorcap://
```

### 2. Google — consent screen'i yayınla
Google Cloud → OAuth consent screen → **Publish app** (Production). Scope'lar temel
(`email`, `profile`, `openid`) olduğu için Google doğrulaması gerekmez. (Test
aşamasında sadece "Test users"a eklenen hesaplar giriş yapabilir.)

### 3. Apple Developer hesabı (ücretli, $99/yıl) — ZORUNLU
Gerçek cihaz build'i, Sign in with Apple ve App Store yüklemesi için şart.
- App ID `com.voorcap.app` + **Sign in with Apple** + **Push Notifications** capability.
- Bunları EAS ilk build'de otomatik kurabilir ("set up credentials?" → Yes).

### 4. Dev/Test build (EAS) — kendi terminalinde
```bash
npm install -g eas-cli
eas login            # Expo hesabı
eas init             # projeyi bağlar, app.json'a projectId ekler

# Gerçek cihaz (Apple + Google'ı gerçekten test etmek için — önerilen):
eas build --profile preview --platform ios

# (Alternatif: sadece simülatör smoke test — Apple Sign In sim'de güvenilmez)
# eas build --profile development --platform ios
```
Build'i cihaza kurup **Apple ve Google giriş** butonlarını test et.
> Sosyal giriş Expo Go / simülatörde çalışmaz — mutlaka gerçek cihaz build'i.

### 5. App Store Connect
- `eas.json` içindeki `submit.production.ios` placeholder'larını doldur:
  `appleId`, `ascAppId`, `appleTeamId`.
- Yükle:
  ```bash
  eas build --profile production --platform ios
  eas submit  --profile production --platform ios
  ```
- **Metadata:** [metadata.md](./metadata.md) (isim, açıklama, keywords, screenshot listesi)
- **App Privacy (nutrition label):** [privacy.md](./privacy.md)
- **Screenshot'lar** (6.9" iPhone) + **reviewer için demo hesap** (uygulama girişli
  olduğu için App Review'a çalışan bir hesap gir).

### 6. Web sayfaları — canlı olmalı
- `https://voorcap.com/privacy`
- `https://voorcap.com/terms`
(Uygulama içindeki Settings → Support linkleri bunlara gidiyor.)

### 7. (İleride) Satın alma / IAP
Şu an yok. Eklenince Apple **Guideline 3.1.1** (dijital ürünlerde StoreKit
zorunlu) + privacy label yeniden gözden geçirilmeli.

---

## Önemli değerler (kopyala-yapıştır)
| | |
|---|---|
| Bundle ID | `com.voorcap.app` |
| URL scheme | `voorcap://` |
| Supabase callback URL | `https://nsnypbvtcshfqcpxkdbc.supabase.co/auth/v1/callback` |
| Support e-posta | `support@voorcap.app` |
| DB migration | `db/migrations/0012_report_block.sql` (uygulandı) |
