import { supabase } from '../lib/supabase';

export class LikeService {
  static async getLikeStatus(capsuleId: string): Promise<{ liked: boolean; count: number }> {
    const { data: { user } } = await supabase.auth.getUser();

    const { count } = await supabase
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('capsule_id', capsuleId);

    let liked = false;
    if (user) {
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('capsule_id', capsuleId)
        .eq('user_id', user.id)
        .maybeSingle();
      liked = !!data;
    }

    return { liked, count: count || 0 };
  }

  static async toggleLike(capsuleId: string): Promise<{ liked: boolean; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { liked: false, error: { message: 'Not authenticated' } };

    // Check if already liked
    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('capsule_id', capsuleId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      // Unlike
      const { error } = await supabase.from('likes').delete().eq('id', existing.id);
      return { liked: false, error };
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert({ capsule_id: capsuleId, user_id: user.id } as any);

      // Send notification
      if (!error) {
        const { data: capsule } = await supabase
          .from('capsules')
          .select('owner_id, title')
          .eq('id', capsuleId)
          .maybeSingle();

        if (capsule && capsule.owner_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: capsule.owner_id,
            from_user_id: user.id,
            capsule_id: capsuleId,
            type: 'like',
            message: `liked "${capsule.title}"`,
          } as any);
        }
      }

      return { liked: true, error };
    }
  }
}
