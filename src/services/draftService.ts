import { supabase } from '../lib/supabase';

// drafts table added in migration 0004; not in the generated Database type yet.
const db: any = supabase;

export class DraftService {
  /** Save a create-flow draft (exit guard "Save as draft"). */
  static async save(type: string, payload: any): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };
      const { error } = await db.from('drafts').insert({ owner_id: user.id, type, payload } as any);
      return { error };
    } catch (error) {
      return { error };
    }
  }

  static async list(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await db.from('drafts').select('*').eq('owner_id', user.id).order('updated_at', { ascending: false });
    return (data as any[]) || [];
  }

  static async remove(id: string): Promise<void> {
    await db.from('drafts').delete().eq('id', id);
  }
}
