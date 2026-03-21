import { supabase } from '../lib/supabase';

export interface CommentWithProfile {
  id: string;
  capsule_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export class CommentService {
  static async getComments(capsuleId: string): Promise<{ data: CommentWithProfile[]; error: any }> {
    try {
      // Get comments
      const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('capsule_id', capsuleId)
        .order('created_at', { ascending: true });

      if (error || !comments || comments.length === 0) {
        return { data: [], error };
      }

      // Get unique user IDs
      const userIds = [...new Set((comments as any[]).map(c => c.user_id))];

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      // Merge
      const result = (comments as any[]).map(c => ({
        ...c,
        profiles: profileMap.get(c.user_id) || null,
      }));

      return { data: result, error: null };
    } catch (err) {
      if (__DEV__) console.error('getComments error:', err);
      return { data: [], error: err };
    }
  }

  static async addComment(capsuleId: string, text: string): Promise<{ data: any; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: { message: 'Not authenticated' } };

      // Insert comment
      const { data: inserted, error } = await supabase
        .from('comments')
        .insert({ capsule_id: capsuleId, user_id: user.id, content: text } as any)
        .select()
        .single();

      if (error) {
        if (__DEV__) console.error('Comment insert error:', error);
        return { data: null, error };
      }

      // Get user profile for display
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      const commentWithProfile = {
        ...inserted,
        profiles: profile,
      };

      // Send notifications (fire and forget)
      try {
        const { data: capsule } = await supabase
          .from('capsules')
          .select('owner_id, title')
          .eq('id', capsuleId)
          .maybeSingle();

        const capsuleTitle = (capsule as any)?.title || 'a capsule';
        const capsuleOwnerId = (capsule as any)?.owner_id;

        // Notify capsule owner
        if (capsuleOwnerId && capsuleOwnerId !== user.id) {
          await supabase.from('notifications').insert({
            user_id: capsuleOwnerId,
            from_user_id: user.id,
            capsule_id: capsuleId,
            type: 'comment',
            message: `commented on "${capsuleTitle}"`,
          } as any);
        }

        // Parse @mentions and notify tagged users
        const mentions = text.match(/@(\w+)/g);
        if (mentions && mentions.length > 0) {
          const usernames = mentions.map(m => m.slice(1).toLowerCase());
          const { data: mentionedUsers, error: mentionError } = await supabase
            .from('profiles')
            .select('id, username')
            .in('username', usernames);


          if (mentionedUsers) {
            const notifiedIds = new Set<string>();
            // Track who we already notified (capsule owner)
            if (capsuleOwnerId && capsuleOwnerId !== user.id) {
              notifiedIds.add(capsuleOwnerId);
            }

            for (const mentioned of mentionedUsers as any[]) {
              // Skip if already notified
              if (notifiedIds.has(mentioned.id)) continue;
              notifiedIds.add(mentioned.id);

              const { error: notifError } = await supabase.from('notifications').insert({
                user_id: mentioned.id,
                from_user_id: user.id,
                capsule_id: capsuleId,
                type: 'comment',
                message: `mentioned you in a comment on "${capsuleTitle}"`,
              } as any);

            }
          }
        }
      } catch (e) { if (__DEV__) console.error(e); }

      return { data: commentWithProfile, error: null };
    } catch (err) {
      if (__DEV__) console.error('addComment error:', err);
      return { data: null, error: err };
    }
  }

  static async deleteComment(commentId: string): Promise<{ error: any }> {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    return { error };
  }

  static async getCommentCount(capsuleId: string): Promise<number> {
    const { count } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('capsule_id', capsuleId);
    return count || 0;
  }
}
