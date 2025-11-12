# Bildirim Sistemi Kurulum Kontrol Listesi

## 1. Notifications Tablosunu Kontrol Et

Supabase Dashboard > SQL Editor'e git ve şunu çalıştır:

```sql
-- Tablonun var olup olmadığını kontrol et
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'notifications'
);
```

**Sonuç `false` ise:** Migration'ı çalıştır:

```sql
-- db/migrations/012_add_notifications.sql dosyasının içeriğini buraya yapıştır ve çalıştır
```

## 2. RLS Politikalarını Kontrol Et

```sql
-- Notifications tablosunda RLS politikalarını kontrol et
SELECT * FROM pg_policies WHERE tablename = 'notifications';
```

**4 politika görmelisin:**
- ✅ Users can read their own notifications
- ✅ Users can send notifications
- ✅ Users can update their own notifications
- ✅ Users can delete their own notifications

## 3. Manuel Test

### A. Manuel Bildirim Ekle

```sql
-- Kendi user_id'ni ve bir arkadaşının user_id'sini kullan
-- Önce kendi user_id'ni bul:
SELECT id, email FROM auth.users WHERE email = 'senin@email.com';

-- Sonra test bildirimi ekle:
INSERT INTO notifications (
  type,
  sender_id,
  receiver_id,
  capsule_id,
  message,
  read
) VALUES (
  'private_capsule',
  'SENDER_USER_ID', -- Kapsülü paylaşan kişinin ID'si
  'RECEIVER_USER_ID', -- Bildirimi alacak kişinin ID'si
  NULL, -- Test için NULL bırakabilirsin veya gerçek capsule_id
  'Test notification',
  false
);
```

### B. Bildirim Sayısını Kontrol Et

```sql
-- Alıcının okunmamış bildirim sayısını kontrol et
SELECT COUNT(*) 
FROM notifications 
WHERE receiver_id = 'RECEIVER_USER_ID' 
AND read = false;
```

## 4. React Native Tarafında Debug

### A. Console Log'ları Kontrol Et

Kapsül oluştururken console'da şunları göreceksin:

```
📬 Sending notifications to shared users...
✅ Sent 1 notification(s)
```

**Bunları görmüyorsan:**
- `⚠️ Notifications table not found` → Migration çalıştır
- `⚠️ Failed to send notifications` → RLS politikası hatası

### B. Dashboard'da Badge Kontrolü

1. Kapsül paylaş
2. Alıcı hesabına giriş yap
3. Ana sayfa yüklenirken console'da:
   ```
   🔔 Unread notifications: 1
   ```
4. Badge görünmeli (sağ üst)

## 5. Real-time Subscription Kontrolü

Supabase Dashboard > Database > Replication'a git:

1. **Realtime** sekmesine tıkla
2. `notifications` tablosunu bul
3. **Enable** olduğundan emin ol

## 6. Hızlı Sorun Giderme

### Bildirim Badge Görünmüyor

```typescript
// DashboardScreen.tsx - useEffect içinde log ekle:
useEffect(() => {
  loadUnreadNotifications();
  console.log('🔔 Loading notifications on mount...');
}, []);
```

### Bildirim Gönderilmiyor

```typescript
// CreateCapsuleScreen.tsx - notification gönderimi öncesi:
console.log('📬 Will send to:', sharedWithUsers);
console.log('📬 Sender:', user.id);
console.log('📬 Sender username:', user.user_metadata?.username || user.email);
```

### Real-time Çalışmıyor

```typescript
// DashboardScreen.tsx - subscription içinde:
const channel = NotificationService.subscribeToNotifications(user.id, (notification) => {
  console.log('🔔 REALTIME: New notification received!', notification);
  setUnreadNotifCount(prev => prev + 1);
});
```

## 7. Supabase Realtime Ayarları

Supabase Dashboard'da:

1. **Project Settings** → **API**
2. **Realtime** bölümünü kontrol et
3. `Enable Realtime for all tables` seçili olmalı
4. Veya özellikle `notifications` için etkinleştir

## 8. Test Adımları

1. **Kullanıcı A**: Private kapsül oluştur, Kullanıcı B ile paylaş
2. **Console (A)**: `✅ Sent 1 notification(s)` görmeli
3. **Kullanıcı B**: Uygulamaya giriş yap
4. **Console (B)**: `🔔 Unread notifications: 1` görmeli
5. **Dashboard (B)**: Sağ üstte kırmızı badge "1" görmeli
6. **Tıkla**: My Capsules → Shared sekmesi açılmalı

## Yaygın Hatalar

### "relation notifications does not exist"
→ Migration çalıştırılmamış. `012_add_notifications.sql` çalıştır.

### "new row violates row-level security policy"
→ RLS politikaları yanlış. Politikaları tekrar kontrol et.

### Badge görünmüyor ama console'da sayı var
→ UI render sorunu. `unreadNotifCount > 0` kontrolünü doğrula.

### Real-time çalışmıyor
→ Supabase Realtime ayarlarını kontrol et.

