import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { CapsuleService } from './capsuleService';

const db: any = supabase;
const SEEN_KEY = '@voorcap_unlocked_achievements';

export interface AchievementTier {
  id: string;
  name: string;
  color: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  tier: string;
  points: number;
  icon: string; // Ionicons name
  current: number;
  total: number;
  unlocked: boolean;
}

export const ACHIEVEMENT_TIERS: AchievementTier[] = [
  { id: 'explorer', name: 'Explorer', color: '#3A7BD5' },
  { id: 'keeper', name: 'Keeper', color: '#7B6CB0' },
  { id: 'wanderer', name: 'Wanderer', color: '#D4A24C' },
  { id: 'legend', name: 'Legend', color: '#E8633A' },
];

export interface AchievementSummary {
  tiers: AchievementTier[];
  achievements: Achievement[];
  unlockedCount: number;
  totalCount: number;
  points: number;
  maxPoints: number;
}

export class AchievementService {
  /**
   * Derive achievement progress from existing data (no extra tables).
   *
   * Without `targetUserId` this computes the CURRENT user's summary (unchanged
   * behavior: getUserCapsules + their own saved/trail rows).
   *
   * With `targetUserId` it computes another user's summary from data the viewer
   * can actually see. RLS hides others' private/sealed content — that's fine,
   * achievements are count-based, so we use only the target's PUBLIC caps and
   * whatever saved/trail rows RLS permits. Queries that return nothing due to
   * RLS are treated as zero; this never throws.
   */
  static async compute(targetUserId?: string): Promise<AchievementSummary> {
    const isTarget = !!targetUserId;
    const { data: { user } } = await supabase.auth.getUser();
    const userId = isTarget ? targetUserId : user?.id;

    let caps: any[] = [];
    if (isTarget) {
      // Other users: only their public caps are visible / counted.
      const { data } = await db
        .from('capsules')
        .select('type, is_public')
        .eq('owner_id', targetUserId)
        .eq('is_public', true);
      caps = data || [];
    } else if (user) {
      caps = (await CapsuleService.getUserCapsules()).data || [];
    }

    const createdCount = caps.length;
    const types = new Set(caps.map((c) => c.type || 'public'));
    const launchTypes = ['whisper', 'gathering', 'public', 'trail', 'scroll'];
    const distinctLaunch = launchTypes.filter((t) => types.has(t)).length;
    const has = (t: string) => (types.has(t) ? 1 : 0);

    let savedCount = 0;
    let trailsCompleted = 0;
    if (isTarget) {
      // RLS hides another user's saved_caps / trail_progress rows, so count them
      // via a SECURITY DEFINER RPC (migration 0010). If the RPC isn't present
      // yet, fall back to 0 — those two badges just won't show for others.
      try {
        const { data: bc } = await db.rpc('user_badge_counts', { p_user: targetUserId });
        const row = Array.isArray(bc) ? bc[0] : bc;
        savedCount = row?.saved_count || 0;
        trailsCompleted = row?.trails_completed || 0;
      } catch { /* RPC missing — leave both at 0 */ }
    } else if (userId) {
      const { count: sc } = await db
        .from('saved_caps')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      savedCount = sc || 0;
      const { count: tc } = await db
        .from('trail_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('completed_at', 'is', null);
      trailsCompleted = tc || 0;
    }

    const def = (
      id: string, name: string, description: string, tier: string, points: number,
      icon: string, current: number, total: number,
    ): Achievement => ({ id, name, description, tier, points, icon, current: Math.min(current, total), total, unlocked: current >= total });

    const achievements: Achievement[] = [
      def('first_seal', 'First Seal', 'Create your first cap', 'explorer', 10, 'ribbon', createdCount, 1),
      def('open_book', 'Open Book', 'Leave a public cap', 'explorer', 15, 'earth', has('public'), 1),
      def('whisperer', 'Whisperer', 'Send a whisper', 'explorer', 15, 'mail', has('whisper'), 1),
      def('trailblazer', 'Trailblazer', 'Create a trail', 'explorer', 20, 'trail-sign', has('trail'), 1),
      def('gatherer', 'Gatherer', 'Start a gathering', 'keeper', 25, 'people', has('gathering'), 1),
      def('scribe', 'Scribe', 'Seal a scroll', 'keeper', 25, 'book', has('scroll'), 1),
      def('moment_keeper', 'Moment Keeper', 'Seal 10 caps', 'keeper', 40, 'albums', createdCount, 10),
      def('collector', 'Collector', 'Save 5 caps', 'keeper', 30, 'bookmark', savedCount, 5),
      def('path_finder', 'Path Finder', 'Complete a trail', 'wanderer', 55, 'flag', trailsCompleted, 1),
      def('seasoned', 'Seasoned', 'Seal 25 caps', 'wanderer', 90, 'flame', createdCount, 25),
      def('complete_seal', 'The Complete Seal', 'Create all 5 cap types', 'legend', 200, 'diamond', distinctLaunch, 5),
      def('keeper_of_many', 'Keeper of Many', 'Seal 50 caps', 'legend', 150, 'trophy', createdCount, 50),
    ];

    const unlockedCount = achievements.filter((a) => a.unlocked).length;
    const points = achievements.filter((a) => a.unlocked).reduce((s, a) => s + a.points, 0);
    const maxPoints = achievements.reduce((s, a) => s + a.points, 0);

    return { tiers: ACHIEVEMENT_TIERS, achievements, unlockedCount, totalCount: achievements.length, points, maxPoints };
  }

  /**
   * Recompute achievements and return any that are newly unlocked since the
   * last check (persisted in AsyncStorage). Call after actions that can unlock
   * one (e.g. creating a cap).
   */
  static async checkNewlyUnlocked(): Promise<Achievement[]> {
    try {
      const summary = await this.compute();
      const unlockedIds = summary.achievements.filter((a) => a.unlocked).map((a) => a.id);
      const raw = await AsyncStorage.getItem(SEEN_KEY);
      const seen: string[] = raw ? JSON.parse(raw) : [];
      const seenSet = new Set(seen);
      const fresh = summary.achievements.filter((a) => a.unlocked && !seenSet.has(a.id));
      // Persist the full current set (including any already seen).
      await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(unlockedIds));
      // On the very first run (no stored set) don't spam — just seed it.
      if (raw === null) return [];
      return fresh;
    } catch {
      return [];
    }
  }
}
