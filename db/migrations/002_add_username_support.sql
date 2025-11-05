-- Add username, email, and phone_number columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Create an index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Add a constraint to ensure username is lowercase
ALTER TABLE profiles
ADD CONSTRAINT username_lowercase CHECK (username = LOWER(username));

-- Update existing profiles to add email from auth.users
-- Note: This might need to be run as a separate script if you have existing data
UPDATE profiles
SET email = au.email
FROM auth.users au
WHERE profiles.id = au.id AND profiles.email IS NULL;

