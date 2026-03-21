import { supabase } from '../lib/supabase';

export class ChainService {
  static async getReplies(capsuleId: string): Promise<any[]> {
    const { data } = await supabase
      .from('capsules')
      .select('id, owner_id, title, description, media_url, media_type, created_at')
      .eq('parent_capsule_id', capsuleId)
      .order('created_at', { ascending: true });
    return (data as any[]) || [];
  }

  static async getParent(parentId: string): Promise<any> {
    const { data } = await supabase
      .from('capsules')
      .select('id, owner_id, title, media_url, created_at')
      .eq('id', parentId)
      .maybeSingle();
    return data;
  }

  static async getChainCount(capsuleId: string): Promise<number> {
    const { count } = await supabase
      .from('capsules')
      .select('id', { count: 'exact', head: true })
      .eq('parent_capsule_id', capsuleId);
    return count || 0;
  }
}
