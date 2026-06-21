-- 0003 — Profile redesign: add bio + location to profiles
-- "One shape. Twelve souls." — a real social profile needs a short bio + place.
-- Idempotent. Existing per-user RLS on `profiles` covers the new columns (no
-- policy change needed: users can already update their own row).

alter table public.profiles
  add column if not exists bio text,
  add column if not exists location text;
