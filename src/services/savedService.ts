import { supabase } from '../lib/supabase';

// New tables (migration 0002) aren't in the generated Database type yet.
const db: any = supabase;

export class SavedService {
  static async isSaved(capsuleId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await db
      .from('saved_caps')
      .select('id')
      .eq('user_id', user.id)
      .eq('capsule_id', capsuleId)
      .maybeSingle();
    return !!data;
  }

  /** Toggle a bookmark; returns the new saved state. */
  static async toggle(capsuleId: string): Promise<{ saved: boolean; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { saved: false, error: 'Not authenticated' };

      const { data: existing } = await db
        .from('saved_caps')
        .select('id')
        .eq('user_id', user.id)
        .eq('capsule_id', capsuleId)
        .maybeSingle();

      if (existing) {
        const { error } = await db.from('saved_caps').delete().eq('id', (existing as any).id);
        return { saved: false, error };
      }
      const { error } = await db
        .from('saved_caps')
        .insert({ user_id: user.id, capsule_id: capsuleId } as any);
      return { saved: true, error };
    } catch (error) {
      return { saved: false, error };
    }
  }

  /** Saved caps for the current user, joined with the capsule record. */
  static async list(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await db
      .from('saved_caps')
      .select('capsule_id, created_at, capsules(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    return ((data as any[]) || []).map((r) => r.capsules).filter(Boolean);
  }
}
