-- Voorcap migration 0002 — Trail stops, trail progress, saved caps, gathering contributions.
-- Additive & idempotent. Run in Supabase SQL editor after 0001.

-- ── Trail stops ─────────────────────────────────────────────────
create table if not exists public.trail_stops (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid not null references public.capsules(id) on delete cascade,
  ordinal int not null default 0,
  title text,
  location_name text,
  lat double precision,
  lng double precision,
  content text,
  photo_url text,
  tip text,
  estimated_minutes int,
  created_at timestamptz not null default now()
);
create index if not exists trail_stops_capsule_idx on public.trail_stops(capsule_id, ordinal);

-- ── Trail progress (per user, per trail) ────────────────────────
create table if not exists public.trail_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  capsule_id uuid not null references public.capsules(id) on delete cascade,
  current_stop_idx int not null default 0,
  completed_stops jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, capsule_id)
);

-- ── Saved caps (bookmarks) ──────────────────────────────────────
create table if not exists public.saved_caps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  capsule_id uuid not null references public.capsules(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, capsule_id)
);
create index if not exists saved_caps_user_idx on public.saved_caps(user_id);

-- ── Gathering contributions (many voices, one cap) ──────────────
create table if not exists public.cap_contributions (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid not null references public.capsules(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text,
  media_url text,
  media_type text,
  emoji text,
  created_at timestamptz not null default now()
);
create index if not exists cap_contributions_capsule_idx on public.cap_contributions(capsule_id);

-- ── Row Level Security ──────────────────────────────────────────
alter table public.trail_stops        enable row level security;
alter table public.trail_progress     enable row level security;
alter table public.saved_caps         enable row level security;
alter table public.cap_contributions  enable row level security;

-- trail_stops: anyone can read; only the cap owner can write.
drop policy if exists trail_stops_select on public.trail_stops;
create policy trail_stops_select on public.trail_stops for select using (true);
drop policy if exists trail_stops_write on public.trail_stops;
create policy trail_stops_write on public.trail_stops for all
  using (exists (select 1 from public.capsules c where c.id = capsule_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.capsules c where c.id = capsule_id and c.owner_id = auth.uid()));

-- trail_progress: each user manages only their own rows.
drop policy if exists trail_progress_own on public.trail_progress;
create policy trail_progress_own on public.trail_progress for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- saved_caps: each user manages only their own bookmarks.
drop policy if exists saved_caps_own on public.saved_caps;
create policy saved_caps_own on public.saved_caps for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- cap_contributions: anyone can read; authenticated users add their own;
-- author or cap owner can delete.
drop policy if exists cap_contributions_select on public.cap_contributions;
create policy cap_contributions_select on public.cap_contributions for select using (true);
drop policy if exists cap_contributions_insert on public.cap_contributions;
create policy cap_contributions_insert on public.cap_contributions for insert
  with check (user_id = auth.uid());
drop policy if exists cap_contributions_delete on public.cap_contributions;
create policy cap_contributions_delete on public.cap_contributions for delete
  using (user_id = auth.uid()
    or exists (select 1 from public.capsules c where c.id = capsule_id and c.owner_id = auth.uid()));
