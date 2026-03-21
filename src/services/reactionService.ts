import { supabase } from '../lib/supabase';

export const REACTIONS = ['❤️', '🔥', '😢', '😮', '🎉', '💀'] as const;
export type ReactionType = typeof REACTIONS[number];

export interface ReactionSummary {
  reaction: string;
  count: number;
  reacted: boolean; // current user reacted with this
}

export class ReactionService {
  static async getReactions(capsuleId: string): Promise<ReactionSummary[]> {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    const { data } = await supabase
      .from('likes')
      .select('id, user_id, reaction')
      .eq('capsule_id', capsuleId);

    const rows = (data as any[]) || [];
    const map = new Map<string, { count: number; reacted: boolean }>();

    for (const row of rows) {
      const r = row.reaction || '❤️';
      const prev = map.get(r) || { count: 0, reacted: false };
      prev.count++;
      if (row.user_id === userId) prev.reacted = true;
      map.set(r, prev);
    }

    return Array.from(map.entries()).map(([reaction, { count, reacted }]) => ({
      reaction,
      count,
      reacted,
    }));
  }

  static async toggleReaction(capsuleId: string, reaction: string): Promise<{ error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Check existing
    const { data: existing } = await supabase
      .from('likes')
      .select('id, reaction')
      .eq('capsule_id', capsuleId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      if ((existing as any).reaction === reaction) {
        // Remove reaction
        await supabase.from('likes').delete().eq('id', (existing as any).id);
      } else {
        // Change reaction
        await supabase.from('likes').update({ reaction } as any).eq('id', (existing as any).id);
      }
    } else {
      // Add reaction
      const { error } = await supabase
        .from('likes')
        .insert({ capsule_id: capsuleId, user_id: user.id, reaction } as any);

      if (!error) {
        // Notification
        const { data: capsule } = await supabase
          .from('capsules')
          .select('owner_id, title')
          .eq('id', capsuleId)
          .maybeSingle();

        if (capsule && (capsule as any).owner_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: (capsule as any).owner_id,
            from_user_id: user.id,
            capsule_id: capsuleId,
            type: 'like',
            message: `reacted ${reaction} to "${(capsule as any).title}"`,
          } as any);
        }
      }
      return { error };
    }

    return { error: null };
  }
}
