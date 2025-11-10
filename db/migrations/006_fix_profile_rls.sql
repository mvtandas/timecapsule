-- Fix RLS policies for profiles table to allow viewing other users' profiles
-- This migration ensures that users can view other users' public profile information

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow read access to all users" ON profiles;
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;

-- Enable RLS on profiles table (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read all profiles
CREATE POLICY "Allow authenticated users to read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- Keep existing policies for users to update their own profile
-- This allows users to update only their own profile data
CREATE POLICY "Users can update own profile" 
ON profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile (for new signups)
CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Optional: Add index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

