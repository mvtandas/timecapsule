-- Voorcap migration 0008 — per-user preferences (settings toggles).
-- Additive & idempotent. Run in Supabase SQL editor after 0007.
-- Powers the Settings → Notifications / Privacy toggles and the default home layout.

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notif_push boolean not null default true,
  notif_email boolean not null default false,
  notif_marketing boolean not null default false,
  privacy_public boolean not null default true,
  privacy_location boolean not null default true,
  privacy_messages boolean not null default true,
  home_layout text not null default 'map' check (home_layout in ('map', 'split', 'feed')),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_preferences' and policyname='user_preferences_own') then
    create policy user_preferences_own on public.user_preferences
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
