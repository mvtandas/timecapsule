-- Voorcap migration 0012 — reporting & blocking (App Store Guideline 1.2)
-- Additive & idempotent: safe to run more than once. Run in the Supabase
-- SQL editor (Dashboard → SQL → New query → paste → Run).
--
-- Brings the report/block tables into the canonical 0001+ series. They were
-- previously only defined in the older, un-tracked `012_report_block.sql`, so on
-- databases built from the 4-digit series they may not exist — which silently
-- breaks in-app reporting and blocking. This creates them if missing and
-- replaces the original permissive RLS (USING (true)) with per-user policies.

-- ── Tables ──────────────────────────────────────────────────────────
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete cascade,
  capsule_id uuid references public.capsules(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reason text not null,
  details text,
  created_at timestamptz default now()
);

create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (blocker_id, blocked_id)
);

create index if not exists blocked_users_blocker_idx on public.blocked_users (blocker_id);

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.reports enable row level security;
alter table public.blocked_users enable row level security;

-- Drop the original permissive policies (and any prior run of this one) so the
-- tightened versions below take effect whether or not 012 was applied first.
drop policy if exists "reports_insert" on public.reports;
drop policy if exists "reports_select" on public.reports;
drop policy if exists "blocked_select" on public.blocked_users;
drop policy if exists "blocked_insert" on public.blocked_users;
drop policy if exists "blocked_delete" on public.blocked_users;

-- reports: a user may file a report as themselves and read only their own.
-- (Moderation is done with the service_role key, which bypasses RLS.)
create policy "reports_insert" on public.reports
  for insert with check (reporter_id = auth.uid());
create policy "reports_select" on public.reports
  for select using (reporter_id = auth.uid());

-- blocked_users: a user manages only their own block list. Delete also allows
-- the blocked party's id so account deletion can clean up both directions.
create policy "blocked_select" on public.blocked_users
  for select using (blocker_id = auth.uid());
create policy "blocked_insert" on public.blocked_users
  for insert with check (blocker_id = auth.uid());
create policy "blocked_delete" on public.blocked_users
  for delete using (blocker_id = auth.uid() or blocked_id = auth.uid());
