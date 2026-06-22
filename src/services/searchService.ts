import { supabase } from '../lib/supabase';
import { CapsuleService } from './capsuleService';

const esc = (q: string) => q.replace(/[%,]/g, ' ').trim();

export interface PlaceResult {
  name: string;
  count: number;
}

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

  /** Distinct places (location_name) from accessible caps, with a per-place cap count. */
  static async searchPlaces(query: string): Promise<PlaceResult[]> {
    const q = esc(query).toLowerCase();
    const { data } = await CapsuleService.getAllAccessibleCapsules();
    const caps: any[] = data || [];
    const counts = new Map<string, number>();
    for (const c of caps) {
      const name = (c.location_name || '').trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return Array.from(counts.entries())
      .filter(([name]) => !q || name.toLowerCase().includes(q))
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  /** Suggested people to connect with — profiles the user isn't already
   *  connected to (no pending/accepted friend_request), excluding self. */
  static async getSuggestedUsers(limit = 20): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    // Exclude anyone already in a friend_request with me (either direction).
    const { data: reqs } = await supabase
      .from('friend_requests')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
    const excluded = new Set<string>([user.id]);
    ((reqs as any[]) || []).forEach((r) => { excluded.add(r.sender_id); excluded.add(r.receiver_id); });
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .order('created_at', { ascending: false })
      .limit(limit + excluded.size);
    return ((data as any[]) || []).filter((p) => !excluded.has(p.id)).slice(0, limit);
  }
}
