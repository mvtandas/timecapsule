import { supabase } from '../lib/supabase';

const esc = (q: string) => q.replace(/[%,]/g, ' ').trim();

export class SearchService {
  /** Public caps matching the query by title or location. */
  static async searchCaps(query: string): Promise<any[]> {
    const q = esc(query);
    if (!q) return [];
    const { data } = await supabase
      .from('capsules')
      .select('*')
      .eq('is_public', true)
      .or(`title.ilike.%${q}%,location_name.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(25);
    return (data as any[]) || [];
  }

  /** Profiles matching the query by username or display name. */
  static async searchPeople(query: string): Promise<any[]> {
    const q = esc(query);
    if (!q) return [];
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(25);
    return ((data as any[]) || []).filter((p) => p.id !== user?.id);
  }
}
