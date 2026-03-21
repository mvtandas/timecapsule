import { supabase } from '../lib/supabase';

export class CollaborativeService {
  static async addCollaborator(capsuleId: string, userId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('capsule_collaborators')
      .insert({ capsule_id: capsuleId, user_id: userId } as any);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id !== userId) {
        const { data: capsule } = await supabase
          .from('capsules').select('title').eq('id', capsuleId).maybeSingle();
        await supabase.from('notifications').insert({
          user_id: userId,
          from_user_id: user.id,
          capsule_id: capsuleId,
          type: 'comment',
          message: `invited you to collaborate on "${(capsule as any)?.title || 'a capsule'}"`,
        } as any);
      }
    }
    return { error };
  }

  static async removeCollaborator(capsuleId: string, userId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('capsule_collaborators')
      .delete()
      .eq('capsule_id', capsuleId)
      .eq('user_id', userId);
    return { error };
  }

  static async getCollaborators(capsuleId: string): Promise<any[]> {
    const { data } = await supabase
      .from('capsule_collaborators')
      .select('user_id')
      .eq('capsule_id', capsuleId);

    if (!data || data.length === 0) return [];

    const userIds = (data as any[]).map(d => d.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', userIds);

    return (profiles as any[]) || [];
  }

  static async addMediaToCapsule(capsuleId: string, mediaUrl: string, mediaType: string): Promise<{ error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Check if user is owner or collaborator
    const { data: capsule } = await supabase
      .from('capsules').select('owner_id, content_refs').eq('id', capsuleId).maybeSingle();

    if (!capsule) return { error: 'Capsule not found' };

    const isOwner = (capsule as any).owner_id === user.id;
    if (!isOwner) {
      const { data: collab } = await supabase
        .from('capsule_collaborators')
        .select('id')
        .eq('capsule_id', capsuleId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!collab) return { error: 'Not authorized' };
    }

    const currentRefs = (capsule as any).content_refs || [];
    const newRefs = [...currentRefs, { url: mediaUrl, type: mediaType, added_by: user.id }];

    const { error } = await supabase
      .from('capsules')
      .update({ content_refs: newRefs } as any)
      .eq('id', capsuleId);

    return { error };
  }
}
