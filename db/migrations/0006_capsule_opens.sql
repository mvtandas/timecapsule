-- Voorcap migration 0006 — per-user "opened" tracking.
-- Powers the Discover "Unopened" filter and the profile "Opened" stat.
-- Additive & idempotent. Run in Supabase SQL editor after 0005.

create table if not exists public.capsule_opens (
  user_id    uuid not null references auth.users(id) on delete cascade,
  capsule_id uuid not null references public.capsules(id) on delete cascade,
  opened_at  timestamptz not null default now(),
  primary key (user_id, capsule_id)
);

alter table public.capsule_opens enable row level security;

-- A user can see and manage only their own open records.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'capsule_opens' and policyname = 'capsule_opens_select_own') then
    create policy capsule_opens_select_own on public.capsule_opens
      for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'capsule_opens' and policyname = 'capsule_opens_insert_own') then
    create policy capsule_opens_insert_own on public.capsule_opens
      for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'capsule_opens' and policyname = 'capsule_opens_delete_own') then
    create policy capsule_opens_delete_own on public.capsule_opens
      for delete using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_capsule_opens_user on public.capsule_opens(user_id);
