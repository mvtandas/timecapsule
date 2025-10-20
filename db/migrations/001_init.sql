-- Profiles table
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Capsules table
create table capsules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id),
  title text,
  description text,
  content_refs jsonb,
  open_at timestamptz,
  lat double precision,
  lng double precision,
  is_public boolean default false,
  allowed_users jsonb,
  blockchain_hash text,
  created_at timestamptz default now()
);

-- Capsule contents table
create table capsule_contents (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid references capsules(id) on delete cascade,
  content_type text check (content_type in ('image', 'video', 'audio', 'text')),
  file_url text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Shared capsules table
create table shared_capsules (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid references capsules(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  permission text check (permission in ('view', 'edit')),
  created_at timestamptz default now()
);

-- Create indexes
create index capsules_owner_id_idx on capsules(owner_id);
create index capsules_open_at_idx on capsules(open_at);
create index capsules_location_idx on capsules(lat, lng);
create index capsule_contents_capsule_id_idx on capsule_contents(capsule_id);
create index shared_capsules_capsule_id_idx on shared_capsules(capsule_id);
create index shared_capsules_user_id_idx on shared_capsules(user_id);

-- Row Level Security
alter table profiles enable row level security;
alter table capsules enable row level security;
alter table capsule_contents enable row level security;
alter table shared_capsules enable row level security;

-- Profiles RLS policies
create policy "Users can view own profile."
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile."
  on profiles for update using (auth.uid() = id);

-- Capsules RLS policies
create policy "Users can view own capsules."
  on capsules for select using (auth.uid() = owner_id);

create policy "Users can view public capsules."
  on capsules for select using (is_public = true);

create policy "Users can view shared capsules."
  on capsules for select using (
    id in (
      select capsule_id from shared_capsules where user_id = auth.uid()
    )
  );

create policy "Users can insert own capsules."
  on capsules for insert with check (auth.uid() = owner_id);

create policy "Users can update own capsules."
  on capsules for update using (auth.uid() = owner_id);

create policy "Users can delete own capsules."
  on capsules for delete using (auth.uid() = owner_id);

-- Capsule contents RLS policies
create policy "Users can view contents of accessible capsules."
  on capsule_contents for select using (
    capsule_id in (
      select id from capsules where 
        owner_id = auth.uid() or 
        is_public = true or
        id in (
          select capsule_id from shared_capsules where user_id = auth.uid()
        )
    )
  );

create policy "Users can insert contents for own capsules."
  on capsule_contents for insert with check (
    capsule_id in (
      select id from capsules where owner_id = auth.uid()
    )
  );

-- Shared capsules RLS policies
create policy "Users can view shared capsules."
  on shared_capsules for select using (auth.uid() = user_id);

create policy "Users can insert shared capsules."
  on shared_capsules for insert with check (auth.uid() = user_id);

create policy "Users can delete shared capsules."
  on shared_capsules for delete using (auth.uid() = user_id);