-- Voorcap migration 0009 — seal/privacy hardening.
-- Additive & idempotent. Run in Supabase SQL editor after 0008.
--
-- Fixes three audit findings:
--   (1) CRITICAL: sealed (time-locked) cap payload was downloadable by anyone
--       before unlock — the seal was enforced only client-side. We add a
--       security-invoker VIEW that NULLs the secret content columns while a cap
--       is sealed (open_at in the future) for everyone except the owner.
--   (2) Whisper recipients could never read a whisper addressed to them — no
--       RLS path for recipient_id. We add a recipient SELECT policy.
--   (3) Private Gathering invitees got no access — owners could not insert
--       shares for their own capsules. We add an owner-can-share INSERT policy.

-- ============================================================================
-- (1) Masking view for discovery / feed / detail reads.
-- security_invoker = on  → the base table's RLS still applies to the caller.
-- The 4 secret payload columns (description, body, media_url, content_refs) are
-- returned only when the caller owns the cap OR the cap is not time-locked
-- (open_at is null or already passed). Location columns (lat/lng/location_name/
-- location_hint) and cover_photo_url stay visible so the cap is still
-- discoverable on the map (walk-to-unlock is the intended mechanic) and the
-- cover acts as a teaser. `status` is intentionally NOT used here because it is
-- set once at creation and goes stale once open_at passes.
-- ============================================================================
create or replace view public.capsules_view
with (security_invoker = on) as
select
  c.id, c.owner_id, c.title,
  case when c.owner_id = auth.uid() or c.open_at is null or c.open_at <= now()
       then c.description else null end as description,
  case when c.owner_id = auth.uid() or c.open_at is null or c.open_at <= now()
       then c.content_refs else null end as content_refs,
  c.open_at, c.lat, c.lng, c.is_public, c.allowed_users, c.blockchain_hash,
  c.created_at,
  case when c.owner_id = auth.uid() or c.open_at is null or c.open_at <= now()
       then c.media_url else null end as media_url,
  c.media_type, c.is_locked, c.view_count, c.shared_with, c.visibility,
  c.category, c.tags, c.parent_capsule_id, c.type, c.location_name,
  c.is_anonymous, c.cover_photo_url, c.recipient_id, c.is_self_whisper,
  c.location_hint, c.allow_reactions, c.allow_comments, c.expires_at, c.status,
  c.gathering_blind, c.allow_join_requests, c.total_distance_km, c.total_minutes,
  c.cover_transform,
  case when c.owner_id = auth.uid() or c.open_at is null or c.open_at <= now()
       then c.body else null end as body
from public.capsules c;

grant select on public.capsules_view to authenticated, anon;

-- ============================================================================
-- (2) Whisper recipients can read whispers addressed to them.
-- Additive SELECT policy (policies are OR'd with the existing public/owner one).
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'capsules'
      and policyname = 'Recipients can view their whispers'
  ) then
    create policy "Recipients can view their whispers" on public.capsules
      for select using (recipient_id is not null and recipient_id = auth.uid());
  end if;
end $$;

-- ============================================================================
-- (3) Capsule owners can create shares for their own capsules
-- (powers private Gathering invites). Keeps the existing self-insert policy.
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'shared_capsules'
      and policyname = 'Owners can share their capsules'
  ) then
    create policy "Owners can share their capsules" on public.shared_capsules
      for insert with check (
        exists (
          select 1 from public.capsules c
          where c.id = capsule_id and c.owner_id = auth.uid()
        )
      );
  end if;
end $$;
