# Media Visibility - Quick Start Guide

## 🚀 Setup (5 Minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Supabase Storage Bucket
- Go to: **Supabase Dashboard** → **Storage**
- Click: **New bucket**
- Name: `capsules_media`
- ✅ Check "Public bucket"
- Click: **Create bucket**

### 3. Run Database Migration
- Go to: **Supabase Dashboard** → **SQL Editor**
- Copy/paste contents of: `db/migrations/007_add_media_support.sql`
- Click: **Run**

### 4. Verify Setup
- Go to: **Storage** → **Policies**
- Select: `capsules_media` bucket
- Verify you see **4 policies** (upload, view own, view public, delete)

## ✅ Done! Test It

### Create a capsule with photo:
1. Open app → Create Capsule
2. Add title, message, date
3. **Step 4: Tap "Choose from Library"**
4. Select a photo
5. Create capsule

### View the capsule:
1. Go to Dashboard
2. Tap your capsule
3. Photo should display from Supabase Storage
4. If locked (future date): Blur overlay with lock icon

## 📁 Where Files Are Stored

```
Supabase Storage: capsules_media/
  └── {your_user_id}/
      └── {capsule_id}_{timestamp}.jpg
```

## 🔐 Access Control

| Capsule Type | Who Can View Media | Storage Access |
|--------------|-------------------|----------------|
| **Public** | Everyone | Public read via RLS |
| **Private** | Owner + Allowed Users | Restricted to user folder |
| **Locked** | Media loads but blurred | Same as above + blur overlay |

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Upload fails | Check bucket exists and is public |
| Media not showing | Verify migration ran, check `media_url` field |
| Permission denied | Check storage policies are enabled |
| Blur not showing | Verify `is_locked` = true in database |

## 📚 Full Documentation

For complete details, see: `MEDIA_VISIBILITY_IMPLEMENTATION.md`

