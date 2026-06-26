import { supabase } from '../lib/supabase';
import { withTimeout } from '../utils/withTimeout';

import type { CapTypeId } from '../constants/capTypes';

export interface Capsule {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  content_refs: any[] | null;
  open_at: string | null;
  lat: number | null;
  lng: number | null;
  is_public: boolean;
  allowed_users: any[] | null;
  blockchain_hash: string | null;
  created_at: string;
  view_count?: number;
  media_url?: string | null;
  media_type?: 'image' | 'video' | 'audio' | 'none';
  is_locked?: boolean;
  // Voorcap cap-type fields (migration 0001)
  type?: CapTypeId;
  location_name?: string | null;
  is_anonymous?: boolean;
  cover_photo_url?: string | null;
}

export interface CreateCapsuleData {
  /** Optional client-generated id for idempotent create (retry-safe). */
  id?: string;
  title: string;
  description?: string | null;
  open_at?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_public?: boolean;
  content_refs?: any[];
  media_url?: string | null;
  media_type?: 'image' | 'video' | 'audio' | 'none';
  is_locked?: boolean;
  category?: string;
  // Voorcap cap-type fields (migration 0001)
  type?: CapTypeId;
  location_name?: string | null;
  is_anonymous?: boolean;
  cover_photo_url?: string | null;
  // Per-type create-flow fields (migration 0004)
  recipient_id?: string | null;
  is_self_whisper?: boolean;
  location_hint?: string | null;
  allow_reactions?: boolean;
  allow_comments?: boolean;
  expires_at?: string | null;
  status?: 'sealed' | 'open';
  gathering_blind?: boolean;
  allow_join_requests?: boolean;
  total_distance_km?: number | null;
  total_minutes?: number | null;
  cover_transform?: any;
  body?: any;
}

export class CapsuleService {
  /**
   * Defense-in-depth: blank the secret payload of any cap that is still
   * time-locked (open_at in the future) and not owned by the viewer, so sealed
   * content never reaches the UI even if a raw query returned it. The
   * authoritative guard is the `capsules_view` server-side masking (migration
   * 0009); this mirrors it client-side and also covers base-table fallback /
   * embedded-join reads.
   */
  static stripSealed<T extends Record<string, any>>(caps: T[], viewerId: string | null): T[] {
    const now = Date.now();
    return (caps || []).map((c: any) => {
      if (!c) return c;
      const sealed = c.open_at && new Date(c.open_at).getTime() > now;
      if (!sealed || c.owner_id === viewerId) return c;
      return { ...c, description: null, body: null, media_url: null, content_refs: null };
    }) as T[];
  }

  // Get all user's capsules
  static async getUserCapsules() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('capsules')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Create a new capsule — wrapped in a timeout so a dead/paused backend or a
  // stalled network surfaces a clear error instead of an infinite "sealing" spinner.
  static async createCapsule(capsuleData: CreateCapsuleData) {
    try {
      return await withTimeout(CapsuleService._createCapsule(capsuleData), 25000, 'Creating capsule');
    } catch (error) {
      return { data: null, error };
    }
  }

  private static async _createCapsule(capsuleData: CreateCapsuleData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No user logged in');

      // CRITICAL: Ensure profile exists before creating capsule
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        // Create profile if it doesn't exist
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
          } as any);

        if (insertError) {
          if (__DEV__) console.error('Failed to create profile:', insertError);
          throw new Error('Failed to initialize user profile. Please try logging out and back in.');
        }
      }

      // Now create the capsule. When the caller supplies a client-generated id,
      // upsert on it so a retry (e.g. after a slow/timed-out request that
      // actually succeeded server-side) updates the same row instead of
      // creating a duplicate cap.
      const row: any = {
        ...(capsuleData.id ? { id: capsuleData.id } : {}),
        owner_id: user.id,
        title: capsuleData.title,
          description: capsuleData.description || null,
          open_at: capsuleData.open_at || null,
          // `?? null` not `|| null` so lat/lng of exactly 0 (equator / prime
          // meridian) are preserved instead of being dropped to null.
          lat: capsuleData.lat ?? null,
          lng: capsuleData.lng ?? null,
          is_public: capsuleData.is_public || false,
          content_refs: capsuleData.content_refs || null,
          media_url: capsuleData.media_url || null,
          media_type: capsuleData.media_type || 'none',
          is_locked: capsuleData.is_locked || false,
          category: capsuleData.category ?? null,
          type: capsuleData.type || 'public',
          location_name: capsuleData.location_name || null,
          is_anonymous: capsuleData.is_anonymous || false,
          cover_photo_url: capsuleData.cover_photo_url || null,
          // Per-type create-flow fields (migration 0004)
          recipient_id: capsuleData.recipient_id ?? null,
          is_self_whisper: capsuleData.is_self_whisper ?? false,
          location_hint: capsuleData.location_hint ?? null,
          allow_reactions: capsuleData.allow_reactions ?? true,
          allow_comments: capsuleData.allow_comments ?? true,
          expires_at: capsuleData.expires_at ?? null,
          status: capsuleData.status ?? (capsuleData.is_locked ? 'sealed' : 'open'),
          gathering_blind: capsuleData.gathering_blind ?? false,
          allow_join_requests: capsuleData.allow_join_requests ?? false,
          total_distance_km: capsuleData.total_distance_km ?? null,
          total_minutes: capsuleData.total_minutes ?? null,
          cover_transform: capsuleData.cover_transform ?? null,
          body: capsuleData.body ?? null,
      };

      const q = capsuleData.id
        ? supabase.from('capsules').upsert(row as any, { onConflict: 'id' })
        : supabase.from('capsules').insert(row as any);
      const { data, error } = await q.select().single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get a single capsule by ID
  static async getCapsule(capsuleId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Read through the masking view (sealed content withheld server-side);
      // fall back to the base table if the view isn't present yet (migration 0009).
      let resp: any = await supabase.from('capsules_view' as any).select('*').eq('id', capsuleId).single();
      if (resp.error) {
        resp = await supabase.from('capsules').select('*').eq('id', capsuleId).single();
      }
      if (resp.error) throw resp.error;
      const [data] = CapsuleService.stripSealed([resp.data], user?.id ?? null);

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Update a capsule
  static async updateCapsule(capsuleId: string, updates: Partial<CreateCapsuleData>) {
    try {
      const { data, error } = await supabase
        .from('capsules')
        .update(updates as any)
        .eq('id', capsuleId)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Delete a capsule
  static async deleteCapsule(capsuleId: string) {
    try {
      const { error } = await supabase
        .from('capsules')
        .delete()
        .eq('id', capsuleId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // Get nearby capsules (for map)
  static async getNearbyCapsules(lat: number, lng: number, radiusKm: number = 10) {
    try {
      // Get current user for blocked users filtering
      const { data: { user } } = await supabase.auth.getUser();

      // Get blocked users if logged in
      let blockedIds: string[] = [];
      if (user) {
        const { data: blocked } = await supabase
          .from('blocked_users')
          .select('blocked_id')
          .eq('blocker_id', user.id);
        blockedIds = (blocked || []).map((b: any) => b.blocked_id);
      }

      // Get all public capsules with location, filter by distance client-side.
      // Read through the masking view (sealed content withheld); fall back to the
      // base table if the view isn't present yet (migration 0009).
      let resp: any = await supabase
        .from('capsules_view' as any)
        .select('*')
        .eq('is_public', true)
        .not('lat', 'is', null)
        .not('lng', 'is', null);
      if (resp.error) {
        resp = await supabase
          .from('capsules')
          .select('*')
          .eq('is_public', true)
          .not('lat', 'is', null)
          .not('lng', 'is', null);
      }
      if (resp.error) throw resp.error;

      // Filter by distance and blocked users
      let filtered = (resp.data || []).filter((capsule: any) => {
        if (capsule.lat == null || capsule.lng == null) return false;
        if (blockedIds.includes(capsule.owner_id)) return false;
        const distance = calculateDistance(lat, lng, capsule.lat, capsule.lng);
        return distance <= radiusKm;
      });
      filtered = CapsuleService.stripSealed(filtered, user?.id ?? null);

      await CapsuleService.attachProfiles(filtered || []);

      return { data: filtered, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get shared capsules (capsules shared with user)
  static async getSharedCapsules() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('shared_capsules')
        .select('capsule_id, capsules(*)')
        .eq('user_id', user.id);

      if (error) throw error;

      // Extract capsules from the result, then strip any still-sealed payload.
      const capsules = CapsuleService.stripSealed(
        (data || []).map((item: any) => item.capsules).filter(Boolean),
        user.id,
      );

      return { data: capsules, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get all accessible capsules (owned + public + shared with user)
  static async getAllAccessibleCapsules() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user logged in');

      // Fetch capsules that are:
      // 1. Owned by user (owner_id = user.id)
      // 2. Public (is_public = true)
      // 3. Shared with user (via shared_capsules table)
      
      // Get blocked users
      const { data: blocked } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', user.id);
      const blockedIds = (blocked || []).map((b: any) => b.blocked_id);

      // Capsules explicitly shared with the user (private shares) must also appear.
      const { data: shared } = await supabase
        .from('shared_capsules')
        .select('capsule_id')
        .eq('user_id', user.id);
      const sharedIds = (shared || []).map((s: any) => s.capsule_id);

      // owner + public + shared-with-me (+ whispers addressed to me via recipient_id).
      const sharedClause = sharedIds.length ? `,id.in.(${sharedIds.join(',')})` : '';
      const fullOr = `owner_id.eq.${user.id},is_public.eq.true,recipient_id.eq.${user.id}${sharedClause}`;
      // Resilient fallback for backends behind on migrations: recipient_id (0004)
      // may not exist, which would 400 the whole query — retry without it.
      const safeOr = `owner_id.eq.${user.id},is_public.eq.true${sharedClause}`;

      const runOr = async (table: string, or: string) =>
        supabase.from(table as any).select('*').or(or).order('created_at', { ascending: false });

      // Read through the masking view (sealed content withheld server-side);
      // fall back to the base table if the view isn't present yet (migration 0009);
      // then drop recipient_id if the column is missing (migration 0004 not run).
      let resp: any = await runOr('capsules_view', fullOr);
      if (resp.error) resp = await runOr('capsules', fullOr);
      if (resp.error) resp = await runOr('capsules', safeOr);
      if (resp.error) throw resp.error;

      // Filter out blocked users' content, then strip any still-sealed payload.
      const filtered = CapsuleService.stripSealed(
        (resp.data || []).filter((c: any) => !blockedIds.includes(c.owner_id)),
        user.id,
      );

      // Attach creator profile (username/display_name/avatar) so feed/discover
      // cards can show "@handle" without an N+1 query per card.
      await CapsuleService.attachProfiles(filtered);

      return { data: filtered, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Batch-fetch the creator profile for a list of caps and attach it as
   * `c.profiles` (mirrors PostgREST embedding) — one query for the whole set.
   * Mutates in place and also returns the list.
   */
  static async attachProfiles(caps: any[]): Promise<any[]> {
    if (!caps || caps.length === 0) return caps || [];
    const ownerIds = Array.from(new Set(caps.map((c) => c.owner_id).filter(Boolean)));
    if (ownerIds.length === 0) return caps;
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', ownerIds);
    const byId = new Map((profiles || []).map((p: any) => [p.id, p]));
    caps.forEach((c) => {
      if (!c.profiles) c.profiles = byId.get(c.owner_id) || null;
    });
    return caps;
  }

  /**
   * Record that the current user has opened a cap (per-user, for the Discover
   * "Unopened" filter and the profile "Opened" stat). Idempotent upsert;
   * silently no-ops if the capsule_opens table isn't present yet (migration 0006).
   */
  static async recordOpen(capsuleId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await (supabase as any)
        .from('capsule_opens')
        .upsert({ user_id: user.id, capsule_id: capsuleId } as any, { onConflict: 'user_id,capsule_id' });
    } catch {
      // table may not exist yet — non-fatal
    }
  }

  /** Capsule ids the current user has opened (for Unopened filter / Opened stat). */
  static async getOpenedCapsuleIds(): Promise<string[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await (supabase as any)
        .from('capsule_opens')
        .select('capsule_id')
        .eq('user_id', user.id);
      return ((data as any[]) || []).map((r) => r.capsule_id);
    } catch {
      return [];
    }
  }

  // Increment view count for a capsule
  static async incrementViewCount(capsuleId: string) {
    try {
      // Call the Postgres function we created
      const { error } = await supabase.rpc('increment_capsule_view_count', {
        capsule_uuid: capsuleId
      });

      if (error) {
        // Silently ignore all errors - this feature is optional
        // User needs to run db/migrations/005_add_view_count.sql in Supabase
        return { error: null };
      }

      return { error: null };
    } catch (error) {
      // Silently ignore all errors - don't break the app
      return { error: null };
    }
  }
}

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

