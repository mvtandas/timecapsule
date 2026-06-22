import { supabase } from '../lib/supabase';

// New table (migration 0002) isn't in the generated Database type yet.
const db: any = supabase;

export interface Contribution {
  id: string;
  capsule_id: string;
  user_id: string;
  text?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  emoji?: string | null;
  created_at: string;
  author?: { display_name?: string; username?: string; avatar_url?: string } | null;
}

export class GatheringService {
  static async addContribution(
    capsuleId: string,
    payload: { text?: string; media_url?: string; media_type?: string; emoji?: string },
  ): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };
      const { error } = await db.from('cap_contributions').insert({
        capsule_id: capsuleId,
        user_id: user.id,
        text: payload.text || null,
        media_url: payload.media_url || null,
        media_type: payload.media_type || null,
        emoji: payload.emoji || null,
      } as any);
      return { error };
    } catch (error) {
      return { error };
    }
  }

  static async getContributions(capsuleId: string): Promise<Contribution[]> {
    const { data } = await db
      .from('cap_contributions')
      .select('*')
      .eq('capsule_id', capsuleId)
      .order('created_at', { ascending: true });
    const rows = (data as Contribution[]) || [];
    if (rows.length === 0) return rows;

    // Attach author profiles
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', userIds);
    const byId = new Map((profiles as any[] || []).map((p) => [p.id, p]));
    return rows.map((r) => ({ ...r, author: byId.get(r.user_id) || null }));
  }

  /** Request to join a gathering (cap owner approves later). Idempotent. */
  static async requestJoin(capsuleId: string): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };
      const { error } = await db
        .from('join_requests')
        .upsert({ capsule_id: capsuleId, user_id: user.id, status: 'pending' } as any, { onConflict: 'capsule_id,user_id' });
      return { error };
    } catch (error) {
      return { error };
    }
  }

  /** Pending join requests for a cap (creator view), with requester profiles attached. */
  static async listJoinRequests(capsuleId: string): Promise<any[]> {
    const { data } = await db
      .from('join_requests')
      .select('*')
      .eq('capsule_id', capsuleId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    const rows = (data as any[]) || [];
    if (rows.length === 0) return rows;
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profiles } = await supabase
      .from('profiles').select('id, display_name, username, avatar_url').in('id', ids);
    const byId = new Map((profiles as any[] || []).map((p) => [p.id, p]));
    return rows.map((r) => ({ ...r, requester: byId.get(r.user_id) || null }));
  }

  /** Approve or decline a join request (creator action). */
  static async respondToJoinRequest(requestId: string, approve: boolean): Promise<{ error: any }> {
    try {
      const { error } = await db
        .from('join_requests')
        .update({ status: approve ? 'approved' : 'declined' } as any)
        .eq('id', requestId);
      return { error };
    } catch (error) {
      return { error };
    }
  }
}
