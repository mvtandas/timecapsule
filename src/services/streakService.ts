import { supabase } from '../lib/supabase';

export interface Streak {
  friend_id: string;
  current_streak: number;
  longest_streak: number;
  last_capsule_at: string | null;
  friend_profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export class StreakService {
  static async getStreaks(): Promise<Streak[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from('streaks')
      .select('*')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .gt('current_streak', 0);

    if (!data) return [];

    const friendIds = (data as any[]).map(s =>
      s.user_id === user.id ? s.friend_id : s.user_id
    );

    if (friendIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', friendIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    return (data as any[]).map(s => {
      const fid = s.user_id === user.id ? s.friend_id : s.user_id;
      return {
        friend_id: fid,
        current_streak: s.current_streak,
        longest_streak: s.longest_streak,
        last_capsule_at: s.last_capsule_at,
        friend_profile: profileMap.get(fid) || null,
      };
    });
  }

  static async updateStreak(friendId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [id1, id2] = [user.id, friendId].sort();

    const { data: existing } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', id1)
      .eq('friend_id', id2)
      .maybeSingle();

    const now = new Date();

    if (existing) {
      const last = (existing as any).last_capsule_at ? new Date((existing as any).last_capsule_at) : null;
      const hoursDiff = last ? (now.getTime() - last.getTime()) / 3600000 : 999;

      let newStreak = (existing as any).current_streak;
      if (hoursDiff >= 24 && hoursDiff < 48) {
        newStreak += 1;
      } else if (hoursDiff >= 48) {
        newStreak = 1;
      }

      const longest = Math.max(newStreak, (existing as any).longest_streak);

      await supabase.from('streaks')
        .update({ current_streak: newStreak, longest_streak: longest, last_capsule_at: now.toISOString(), updated_at: now.toISOString() } as any)
        .eq('id', (existing as any).id);
    } else {
      await supabase.from('streaks').insert({
        user_id: id1,
        friend_id: id2,
        current_streak: 1,
        longest_streak: 1,
        last_capsule_at: now.toISOString(),
      } as any);
    }
  }
}
