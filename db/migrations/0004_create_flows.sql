-- Voorcap migration 0004 — per-type create flows (Whisper/Public/Scroll/Gathering/Trail).
-- Additive & idempotent: safe to run more than once. Run in the Supabase SQL
-- editor (Dashboard → SQL → New query → paste → Run) AFTER 0001–0003.
--
-- Adds the columns/tables the demo's bespoke create wizards need that aren't
-- already present. (We keep the existing `open_at` for the unlock time — no
-- `opens_at`; and `is_public` for privacy.)

-- ── capsules: new per-type columns ──────────────────────────────
alter table public.capsules
  add column if not exists recipient_id uuid references auth.users(id) on delete set null, -- whisper
  add column if not exists is_self_whisper boolean not null default false,                 -- whisper
  add column if not exists location_hint text,                                             -- whisper/public hint
  add column if not exists allow_reactions boolean not null default true,                  -- public
  add column if not exists allow_comments boolean not null default true,                   -- public
  add column if not exists expires_at timestamptz,                                         -- public/scroll/trail "expires on"
  add column if not exists status text not null default 'open',                            -- 'sealed' | 'open'
  add column if not exists gathering_blind boolean not null default false,                 -- gathering blind vs open
  add column if not exists allow_join_requests boolean not null default false,             -- gathering
  add column if not exists total_distance_km double precision,                             -- trail aggregate
  add column if not exists total_minutes int,                                              -- trail aggregate
  add column if not exists cover_transform jsonb,                                          -- cover crop (zoom/pan)
  add column if not exists body jsonb;                                                     -- scroll block content (JSON)

-- status sanity check
alter table public.capsules drop constraint if exists capsules_status_check;
alter table public.capsules
  add constraint capsules_status_check check (status in ('sealed','open'));

create index if not exists capsules_recipient_idx on public.capsules(recipient_id);

-- ── drafts (save-as-draft / exit guard) ─────────────────────────
create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'public',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists drafts_owner_idx on public.drafts(owner_id, updated_at desc);

-- ── cap_reactions (emoji reactions on public/scroll caps) ───────
create table if not exists public.cap_reactions (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid not null references public.capsules(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (capsule_id, user_id)
);
create index if not exists cap_reactions_capsule_idx on public.cap_reactions(capsule_id);

-- ── join_requests (gathering "request to join") ─────────────────
create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid not null references public.capsules(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (capsule_id, user_id)
);
create index if not exists join_requests_capsule_idx on public.join_requests(capsule_id);

-- ── Row Level Security ──────────────────────────────────────────
alter table public.drafts        enable row level security;
alter table public.cap_reactions enable row level security;
alter table public.join_requests enable row level security;

-- drafts: each user owns their own.
drop policy if exists drafts_own on public.drafts;
create policy drafts_own on public.drafts for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- cap_reactions: anyone reads tallies; users manage only their own reaction.
drop policy if exists cap_reactions_select on public.cap_reactions;
create policy cap_reactions_select on public.cap_reactions for select using (true);
drop policy if exists cap_reactions_write on public.cap_reactions;
create policy cap_reactions_write on public.cap_reactions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- join_requests: requester manages own; cap owner can read/update for their caps.
drop policy if exists join_requests_own on public.join_requests;
create policy join_requests_own on public.join_requests for all
  using (user_id = auth.uid()
    or exists (select 1 from public.capsules c where c.id = capsule_id and c.owner_id = auth.uid()))
  with check (user_id = auth.uid());
