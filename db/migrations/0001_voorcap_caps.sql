-- Voorcap migration 0001 — cap types ("One shape. Twelve souls.")
-- Additive & idempotent: safe to run more than once. Run in the Supabase
-- SQL editor (Dashboard → SQL → New query → paste → Run).
--
-- Adds a `type` discriminator to the single `capsules` vessel. The CHECK covers
-- all 12 types so V2 needs no schema change; the app only wires the 5 launch
-- types initially. Existing rows default to 'public'.

alter table public.capsules
  add column if not exists type text not null default 'public',
  add column if not exists location_name text,
  add column if not exists is_anonymous boolean not null default false,
  add column if not exists cover_photo_url text;

-- (Re)apply the type CHECK constraint covering all 12 souls.
alter table public.capsules drop constraint if exists capsules_type_check;
alter table public.capsules
  add constraint capsules_type_check check (type in (
    'whisper','gathering','public','trail','scroll',          -- launch (5)
    'crest','bazaar','arena','moment','scholar','vigil','spark' -- V2 (7)
  ));

create index if not exists capsules_type_idx on public.capsules(type);

-- Backfill any null types just in case.
update public.capsules set type = 'public' where type is null;
