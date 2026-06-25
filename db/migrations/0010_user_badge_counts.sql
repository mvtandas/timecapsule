-- Voorcap migration 0010 — public badge counts for any user.
-- Additive & idempotent. Run in Supabase SQL editor after 0009.
--
-- RLS on saved_caps / trail_progress correctly hides a user's rows from others,
-- so when viewing someone else's profile we can't count their saved caps or
-- completed trails — which means their "Collector" / "Path Finder" badges never
-- appear. These are non-sensitive aggregate counts (just numbers), so expose
-- them via a SECURITY DEFINER function that returns ONLY the two totals.

create or replace function public.user_badge_counts(p_user uuid)
returns table(saved_count integer, trails_completed integer)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.saved_caps where user_id = p_user),
    (select count(*)::int from public.trail_progress
       where user_id = p_user and completed_at is not null);
$$;

grant execute on function public.user_badge_counts(uuid) to authenticated, anon;
