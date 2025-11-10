# Supabase Storage Setup for Media Files

This guide will help you set up Supabase Storage for handling capsule media files (images and videos).

## Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `capsules_media`
   - **Public bucket**: ✅ **CHECKED** (we'll control access via RLS policies)
   - **File size limit**: 50MB (adjust as needed)
   - **Allowed MIME types**: Leave empty or specify: `image/*,video/*`
5. Click **Create bucket**

## Step 2: Run Database Migration

Run the migration file to add media fields and storage policies:

```bash
# In Supabase SQL Editor, run:
db/migrations/007_add_media_support.sql
```

This migration will:
- Add `media_url`, `media_type`, and `is_locked` fields to capsules table
- Create storage policies for uploading, viewing, and deleting media
- Set up RLS policies for public and private capsule media

## Step 3: Verify Storage Policies

After running the migration, verify the policies in:
**Storage** → **Policies** → `capsules_media` bucket

You should see these policies:
1. ✅ Users can upload capsule media (INSERT)
2. ✅ Users can view own capsule media (SELECT)
3. ✅ Public read access to public capsule media (SELECT)
4. ✅ Users can delete own capsule media (DELETE)

## Step 4: Test Upload

Test the upload functionality:

1. Create a new capsule with a photo/video
2. Check that the file appears in **Storage** → `capsules_media` → `{user_id}/`
3. Verify the `media_url` is saved in the capsules table

## Storage Structure

Files will be organized as:
```
capsules_media/
  ├── {user_id_1}/
  │   ├── {capsule_id}_1.jpg
  │   ├── {capsule_id}_2.mp4
  │   └── ...
  ├── {user_id_2}/
  │   └── ...
  └── ...
```

## File Naming Convention

Format: `{user_id}/{capsule_id}_{timestamp}.{ext}`

Example: `abc123.../def456..._1699564800000.jpg`

## Access Control

- **Private capsules**: Only the owner and authorized users can view media
- **Public capsules**: Anyone can view media
- **Locked capsules**: Media is fetched but displayed with blur overlay
- All uploads are scoped to the user's folder (`user_id`)

## Troubleshooting

### Cannot upload files
- Verify bucket exists and is public
- Check storage policies are applied
- Verify user is authenticated

### Cannot view media
- Check RLS policies on storage.objects
- Verify media_url is correctly saved in database
- Check capsule is_public setting

### Media not displaying
- Verify file exists in storage bucket
- Check media_url format is correct
- Ensure proper permissions in bucket policies

