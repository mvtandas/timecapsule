# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in the details:
   - **Name**: timecapsule
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to you
4. Click "Create new project"

## 2. Get Your API Keys

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## 3. Create .env File

Create a file named `.env` in the project root with:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace with your actual values from step 2.

## 4. Create Database Tables

Go to **SQL Editor** and run this:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (auto-created by Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Capsules table
CREATE TABLE capsules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_refs JSONB,
  open_at TIMESTAMPTZ,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_public BOOLEAN DEFAULT false,
  allowed_users JSONB,
  blockchain_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Capsule contents table
CREATE TABLE capsule_contents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  capsule_id UUID REFERENCES capsules(id) ON DELETE CASCADE NOT NULL,
  content_type TEXT CHECK (content_type IN ('image', 'video', 'audio', 'text')) NOT NULL,
  file_url TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared capsules table
CREATE TABLE shared_capsules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  capsule_id UUID REFERENCES capsules(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  permission TEXT CHECK (permission IN ('view', 'edit')) DEFAULT 'view',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(capsule_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE capsules ENABLE ROW LEVEL SECURITY;
ALTER TABLE capsule_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_capsules ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Capsules policies
CREATE POLICY "Users can view own capsules"
  ON capsules FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can view shared capsules"
  ON capsules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shared_capsules
      WHERE capsule_id = capsules.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own capsules"
  ON capsules FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own capsules"
  ON capsules FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own capsules"
  ON capsules FOR DELETE
  USING (auth.uid() = owner_id);

-- Capsule contents policies
CREATE POLICY "Users can view contents of accessible capsules"
  ON capsule_contents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM capsules
      WHERE capsules.id = capsule_contents.capsule_id
      AND (capsules.owner_id = auth.uid() OR capsules.is_public = true)
    )
  );

CREATE POLICY "Users can insert contents for own capsules"
  ON capsule_contents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM capsules
      WHERE capsules.id = capsule_contents.capsule_id
      AND capsules.owner_id = auth.uid()
    )
  );

-- Shared capsules policies
CREATE POLICY "Users can view shared capsule records"
  ON shared_capsules FOR SELECT
  USING (
    auth.uid() IN (
      SELECT owner_id FROM capsules WHERE id = capsule_id
    ) OR auth.uid() = user_id
  );

CREATE POLICY "Capsule owners can share capsules"
  ON shared_capsules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM capsules
      WHERE capsules.id = shared_capsules.capsule_id
      AND capsules.owner_id = auth.uid()
    )
  );
```

## 5. Configure Authentication

1. Go to **Authentication** → **URL Configuration**
2. Add these redirect URLs:
   - `timecapsule://auth/callback`
   - `timecapsule://auth/reset-password`

3. Go to **Authentication** → **Providers**
4. Enable **Email** provider
5. Enable **Confirm email** (recommended)

## 6. Configure Storage (Optional - for media files)

1. Go to **Storage**
2. Create a new bucket named `capsule-media`
3. Set it to **Private**
4. Add policies for authenticated users to upload/view their own files

## 7. Test the Connection

1. Make sure `.env` file is created with correct values
2. Restart your Expo server: `npx expo start --clear`
3. Try signing in with your email
4. Check your email for the magic link

## Troubleshooting

- **Error: Missing Supabase environment variables**
  → Check that `.env` file exists and has correct keys

- **Error: Invalid API key**
  → Make sure you copied the **anon/public** key, not the service key

- **Magic link not arriving**
  → Check spam folder
  → Make sure email provider is configured in Supabase
  → Check Supabase logs in Dashboard

- **Connection timeout**
  → Check your internet connection
  → Make sure Supabase URL is correct

