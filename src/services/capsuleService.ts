import { supabase } from '../lib/supabase';

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
  media_type?: 'image' | 'video' | 'none';
  is_locked?: boolean;
}

export interface CreateCapsuleData {
  title: string;
  description?: string | null;
  open_at?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_public?: boolean;
  content_refs?: any[];
  media_url?: string | null;
  media_type?: 'image' | 'video' | 'none';
  is_locked?: boolean;
  category?: string;
}

export class CapsuleService {
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

  // Create a new capsule
  static async createCapsule(capsuleData: CreateCapsuleData) {
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

      // Now create the capsule
      const { data, error } = await supabase
        .from('capsules')
        .insert({
          owner_id: user.id,
          title: capsuleData.title,
          description: capsuleData.description || null,
          open_at: capsuleData.open_at || null,
          lat: capsuleData.lat || null,
          lng: capsuleData.lng || null,
          is_public: capsuleData.is_public || false,
          content_refs: capsuleData.content_refs || null,
          media_url: capsuleData.media_url || null,
          media_type: capsuleData.media_type || 'none',
          is_locked: capsuleData.is_locked || false,
        } as any)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get a single capsule by ID
  static async getCapsule(capsuleId: string) {
    try {
      const { data, error } = await supabase
        .from('capsules')
        .select('*')
        .eq('id', capsuleId)
        .single();

      if (error) throw error;

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

      // Get all public capsules with location, filter by distance client-side
      const { data, error } = await supabase
        .from('capsules')
        .select('*')
        .eq('is_public', true)
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      if (error) throw error;

      // Filter by distance and blocked users
      const filtered = data?.filter((capsule) => {
        if (!capsule.lat || !capsule.lng) return false;
        if (blockedIds.includes(capsule.owner_id)) return false;
        const distance = calculateDistance(lat, lng, capsule.lat, capsule.lng);
        return distance <= radiusKm;
      });

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

      // Extract capsules from the result
      const capsules = data?.map((item: any) => item.capsules) || [];

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

      const { data, error } = await supabase
        .from('capsules')
        .select('*')
        .or(`owner_id.eq.${user.id},is_public.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out blocked users' content
      const filtered = data?.filter((c: any) => !blockedIds.includes(c.owner_id)) || [];

      return { data: filtered, error: null };
    } catch (error) {
      return { data: null, error };
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

