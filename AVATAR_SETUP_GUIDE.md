# Avatar/Profile Photo Setup Guide

## ✅ Implemented Features

1. ✅ Avatar upload to Supabase Storage
2. ✅ Base64 → Uint8Array conversion (no deprecated warnings)
3. ✅ Public URL generation and storage
4. ✅ Profile database updates
5. ✅ Real-time display in ProfileScreen
6. ✅ Loading states and error handling

---

## 🚀 Quick Setup (2 Steps)

### Step 1: Create Storage Bucket

1. **Supabase Dashboard** → **Storage**
2. **"New bucket"** button
3. Settings:
   - **Name:** `avatars`
   - **Public bucket:** ✅ **CHECK THIS**
   - **File size limit:** 5MB
4. **"Create bucket"**

### Step 2: Run Database Migration

1. **Supabase Dashboard** → **SQL Editor**
2. Copy contents of: `db/migrations/008_add_avatars_support.sql`
3. **"Run"** button
4. Verify: "Success. No rows returned" (this is correct!)

---

## ✅ Done! Test It

1. **Open app** → Profile screen
2. **Tap** on avatar image
3. **Choose** "Take Photo" or "Choose from Gallery"
4. **Select** a photo
5. ✅ Photo uploads to Supabase
6. ✅ Avatar displays immediately
7. ✅ Refreshing profile shows the same photo (persisted)

---

## 📊 Verify in Supabase

### Check Storage
**Storage** → `avatars` → `{user_id}` folder → You should see your avatar file

### Check Database
**Table Editor** → `profiles` → Find your user → `avatar_url` field should have a URL

### Check Policies
**Storage** → **Policies** → `avatars` bucket → Should have 4 policies:
1. ✅ Users can upload their own avatar (INSERT)
2. ✅ Users can update their own avatar (UPDATE)
3. ✅ Public read access to avatars (SELECT)
4. ✅ Users can delete their own avatar (DELETE)

---

## 🔧 How It Works

### Upload Flow

```
User selects photo
    ↓
ImagePicker returns local URI
    ↓
MediaService.uploadAvatar(uri, userId)
    ↓
Read file as base64
    ↓
Convert to Uint8Array (no deprecated methods!)
    ↓
Upload to Supabase Storage: avatars/{userId}/{fileName}
    ↓
Get public URL
    ↓
Update profiles table: avatar_url = publicUrl
    ↓
Success! Avatar displays in UI
```

### Display Flow

```
ProfileScreen loads
    ↓
Fetch user from auth store
    ↓
user.avatar_url is set
    ↓
<Image source={{ uri: user.avatar_url }} />
    ↓
Avatar displays from Supabase Storage
```

---

## 🗄️ Storage Structure

```
avatars/
├── {user_id_1}/
│   ├── avatar_{user_id}_{timestamp}.jpg
│   └── avatar_{user_id}_{timestamp}.png
├── {user_id_2}/
│   └── avatar_{user_id}_{timestamp}.jpg
```

---

## 🔐 Security & Permissions

### Storage RLS Policies

1. **Upload** - Users can only upload to their own folder (`{user_id}/`)
2. **Update** - Users can only update files in their own folder
3. **Delete** - Users can only delete files from their own folder
4. **Read** - Anyone can view avatars (public profiles)

### Database RLS

- Profiles table has public read access
- Users can only update their own profile record
- `avatar_url` is publicly readable (so others can see profile photos)

---

## 🎨 UI/UX Features

### ProfileScreen
- **Avatar tap** → Opens photo picker modal
- **Camera icon badge** → Indicates avatar is editable
- **Loading spinner** → Shows while uploading
- **Optimistic UI** → Shows preview immediately
- **Error handling** → Reverts to old photo if upload fails

### Photo Picker Modal
- ✅ Take Photo (Camera)
- ✅ Choose from Gallery (Photo Library)
- ✅ Cancel button
- ✅ Smooth slide-up animation

---

## 🐛 Troubleshooting

### Issue: "Upload failed" error

**Possible causes:**
- Bucket doesn't exist
- Bucket isn't public
- User not authenticated

**Solutions:**
1. Verify `avatars` bucket exists in Storage
2. Check bucket is marked as **public**
3. Verify storage policies ran successfully
4. Ensure user is logged in

### Issue: Avatar not displaying

**Possible causes:**
- `avatar_url` not saved to database
- URL is incorrect
- Image file doesn't exist

**Solutions:**
1. Check Table Editor → `profiles` → `avatar_url` field
2. Copy URL and test in browser
3. Verify file exists in Storage → `avatars` → `{user_id}`

### Issue: Deprecated FileSystem warning

**Solution:**
- ✅ Already fixed! Using FileSystem.EncodingType.Base64
- ✅ No deprecated methods
- ✅ Clean Uint8Array conversion

---

## 📝 Code Reference

### Upload Avatar

```typescript
const { url, error } = await MediaService.uploadAvatar(imageUri, user.id);

if (error) {
  Alert.alert('Error', 'Failed to upload avatar');
} else {
  // Update profile with new URL
  await updateProfile({ avatar_url: url });
}
```

### Display Avatar

```tsx
{profilePhoto ? (
  <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
) : (
  <View style={styles.avatar}>
    <Ionicons name="person" size={48} color="white" />
  </View>
)}
```

---

## ✨ Features Implemented

### MediaService (src/services/mediaService.ts)

- ✅ `uploadAvatar(uri, userId)` - Upload profile photo
- ✅ Base64 → Uint8Array conversion
- ✅ Supabase Storage integration
- ✅ Public URL generation
- ✅ Error handling and logging

### ProfileScreen (src/screens/profile/ProfileScreen.tsx)

- ✅ Avatar tap to change photo
- ✅ Photo picker modal
- ✅ Camera integration
- ✅ Gallery integration
- ✅ Upload progress indicator
- ✅ Optimistic UI updates
- ✅ Error handling with rollback

---

## 🎉 Summary

You now have a **complete, production-ready profile photo system**:

- ✅ Upload photos to Supabase Storage
- ✅ Store URLs in database
- ✅ Display in profile screen
- ✅ Public/private access control
- ✅ No deprecated warnings
- ✅ Smooth UX with loading states

**Everything works with real uploaded files from Supabase Storage!** 🚀

---

## 📚 Related Documentation

- Main implementation: `MEDIA_VISIBILITY_IMPLEMENTATION.md`
- Quick start: `MEDIA_QUICK_START.md`
- Storage setup: `SUPABASE_STORAGE_SETUP.md`

