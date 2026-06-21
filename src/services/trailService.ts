import { supabase } from '../lib/supabase';

// New tables (migration 0002) aren't in the generated Database type yet.
const db: any = supabase;

export interface TrailStop {
  id?: string;
  capsule_id?: string;
  ordinal: number;
  title?: string | null;
  location_name?: string | null;
  lat?: number | null;
  lng?: number | null;
  content?: string | null;
  photo_url?: string | null;
  tip?: string | null;
  estimated_minutes?: number | null;
}

export interface TrailProgress {
  id?: string;
  user_id: string;
  capsule_id: string;
  current_stop_idx: number;
  completed_stops: number[];
  started_at?: string;
  completed_at?: string | null;
}

export class TrailService {
  /**
   * Replace the full ordered set of stops for a trail cap.
   * Non-destructive: captures the existing rows, inserts the new set, and only
   * THEN deletes the old rows — so a failed insert never wipes the user's stops
   * (PostgREST has no multi-statement transaction). Worst case on a delete
   * failure is a few duplicate rows, recoverable on the next save.
   */
  static async saveStops(capsuleId: string, stops: TrailStop[]): Promise<{ error: any }> {
    try {
      const { data: existing } = await db.from('trail_stops').select('id').eq('capsule_id', capsuleId);
      const oldIds = ((existing as any[]) || []).map((r) => r.id);

      if (stops.length > 0) {
        const rows = stops.map((s, i) => ({
          capsule_id: capsuleId,
          ordinal: i,
          title: s.title || null,
          location_name: s.location_name || null,
          lat: s.lat ?? null,
          lng: s.lng ?? null,
          content: s.content || null,
          photo_url: s.photo_url || null,
          tip: s.tip || null,
          estimated_minutes: s.estimated_minutes ?? null,
        }));
        const { error } = await db.from('trail_stops').insert(rows as any);
        if (error) return { error }; // old stops left intact
      }
      // New set landed (or is intentionally empty) — remove the previous rows.
      if (oldIds.length) {
        await db.from('trail_stops').delete().in('id', oldIds);
      }
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  static async getStops(capsuleId: string): Promise<TrailStop[]> {
    const { data } = await db
      .from('trail_stops')
      .select('*')
      .eq('capsule_id', capsuleId)
      .order('ordinal', { ascending: true });
    return (data as TrailStop[]) || [];
  }

  /** Number of trails the current user has completed (for profile stats). */
  static async getCompletedCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { count } = await db
      .from('trail_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('completed_at', 'is', null);
    return count || 0;
  }

  static async getProgress(capsuleId: string): Promise<TrailProgress | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await db
      .from('trail_progress')
      .select('*')
      .eq('capsule_id', capsuleId)
      .eq('user_id', user.id)
      .maybeSingle();
    return (data as TrailProgress) || null;
  }

  /** Upsert progress (advance current stop / mark completed). */
  static async setProgress(
    capsuleId: string,
    currentStopIdx: number,
    completedStops: number[],
    completed = false,
  ): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };
      const { error } = await db
        .from('trail_progress')
        .upsert(
          {
            user_id: user.id,
            capsule_id: capsuleId,
            current_stop_idx: currentStopIdx,
            completed_stops: completedStops,
            completed_at: completed ? new Date().toISOString() : null,
          } as any,
          { onConflict: 'user_id,capsule_id' },
        );
      return { error };
    } catch (error) {
      return { error };
    }
  }
}
