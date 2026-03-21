import { supabase } from '../lib/supabase';

export interface Memory {
  capsule: any;
  yearsAgo: number;
}

export class MemoriesService {
  static async getOnThisDay(): Promise<Memory[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Get all user's capsules
    const { data } = await supabase
      .from('capsules')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (!data) return [];

    // Filter capsules created on this day in previous years
    const memories: Memory[] = [];

    for (const capsule of data as any[]) {
      const created = new Date(capsule.created_at);
      if (
        created.getMonth() + 1 === month &&
        created.getDate() === day &&
        created.getFullYear() < today.getFullYear()
      ) {
        memories.push({
          capsule,
          yearsAgo: today.getFullYear() - created.getFullYear(),
        });
      }
    }

    return memories.sort((a, b) => a.yearsAgo - b.yearsAgo);
  }

  static async getRecentMemories(): Promise<Memory[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data } = await supabase
      .from('capsules')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (!data) return [];

    const memories: Memory[] = [];
    const month = today.getMonth() + 1;
    const dayRange = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return { month: d.getMonth() + 1, day: d.getDate() };
    });

    for (const capsule of data as any[]) {
      const created = new Date(capsule.created_at);
      if (created.getFullYear() >= today.getFullYear()) continue;

      const match = dayRange.find(
        dr => dr.month === created.getMonth() + 1 && dr.day === created.getDate()
      );

      if (match) {
        memories.push({
          capsule,
          yearsAgo: today.getFullYear() - created.getFullYear(),
        });
      }
    }

    return memories.sort((a, b) => a.yearsAgo - b.yearsAgo);
  }
}
