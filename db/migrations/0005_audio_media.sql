-- Voorcap migration 0005 — allow audio (voice) media on caps.
-- Additive & idempotent. Run in Supabase SQL editor after 0004.
--
-- The original media_type CHECK (migration 007) only allowed image/video/none.
-- Voice notes need 'audio'. This drops whatever check currently constrains
-- media_type and re-adds one that includes 'audio'.

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.capsules'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%media_type%'
  loop
    execute format('alter table public.capsules drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.capsules
  add constraint capsules_media_type_check
  check (media_type in ('image', 'video', 'audio', 'none'));
