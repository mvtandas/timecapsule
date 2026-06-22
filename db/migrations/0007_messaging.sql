-- Voorcap migration 0007 — direct messaging (1:1 conversations + messages).
-- Additive & idempotent. Run in Supabase SQL editor after 0006.
-- Messaging is friends-only in the app layer; RLS here restricts rows to the
-- two participants. Notifications reuse the existing `notifications` table.

-- ── conversations (1:1, participant pair stored sorted so it's unique) ──
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index if not exists conversations_user_a_idx on public.conversations(user_a);
create index if not exists conversations_user_b_idx on public.conversations(user_b);
create index if not exists conversations_last_msg_idx on public.conversations(last_message_at desc);

-- ── messages ──
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'cap', 'location')),
  body text,
  cap_id uuid references public.capsules(id) on delete set null,
  lat double precision,
  lng double precision,
  location_name text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);

-- ── RLS: only the two participants can see/use a conversation & its messages ──
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='conversations' and policyname='conversations_participant') then
    create policy conversations_participant on public.conversations
      for all using (auth.uid() = user_a or auth.uid() = user_b)
      with check (auth.uid() = user_a or auth.uid() = user_b);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='messages_participant_select') then
    create policy messages_participant_select on public.messages
      for select using (
        exists (select 1 from public.conversations c
                where c.id = conversation_id and (auth.uid() = c.user_a or auth.uid() = c.user_b))
      );
  end if;

  -- Sender may insert into a conversation they belong to.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='messages_sender_insert') then
    create policy messages_sender_insert on public.messages
      for insert with check (
        auth.uid() = sender_id and
        exists (select 1 from public.conversations c
                where c.id = conversation_id and (auth.uid() = c.user_a or auth.uid() = c.user_b))
      );
  end if;

  -- Either participant may update (used to set read_at on the other's messages).
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='messages_participant_update') then
    create policy messages_participant_update on public.messages
      for update using (
        exists (select 1 from public.conversations c
                where c.id = conversation_id and (auth.uid() = c.user_a or auth.uid() = c.user_b))
      );
  end if;
end $$;
