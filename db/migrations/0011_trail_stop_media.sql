-- Voorcap migration 0011 — per-stop media type for trails.
-- Additive & idempotent. Run in Supabase SQL editor after 0010.
--
-- trail_stops.photo_url already stores a stop's media URL, but there was no way
-- to know whether it's an image or a video. Add media_type so a stop can carry
-- a video (rendered with a player) in addition to a cover image.

alter table public.trail_stops
  add column if not exists media_type text not null default 'image';
