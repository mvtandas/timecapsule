import { supabase } from '../lib/supabase';

export interface ProfileVisit {
  id: string;
  viewer_id: string;
  viewed_user_id: string;
  visited_at: string;
}

export interface RecentVisitProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  visited_at: string;
}

export class ProfileVisitService {
  /**
   * Track a profile visit (upsert)
   * If the visit already exists, update visited_at
   * If not, create a new visit record
   */
  static async trackVisit(viewedUserId: string): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: { message: 'Not authenticated' } };
      }

      if (user.id === viewedUserId) {
        // Don't track visits to own profile
        return { error: null };
      }

      const { error } = await supabase
        .from('profile_visits')
        .upsert(
          {
            viewer_id: user.id,
            viewed_user_id: viewedUserId,
            visited_at: new Date().toISOString(),
          },
          {
            onConflict: 'viewer_id,viewed_user_id',
          }
        );

      if (error) {
        // Silently handle if table doesn't exist yet
        if (error.code === 'PGRST205' || error.message?.includes('profile_visits')) {
          console.warn('⚠️ Profile visits table not found. Run migration 010 to enable this feature.');
          return { error: null };
        }
        console.error('Error tracking visit:', error);
        return { error };
      }

      console.log('📊 Profile visit tracked:', viewedUserId);
      return { error: null };
    } catch (error: any) {
      // Silently handle if table doesn't exist
      if (error?.code === 'PGRST205' || error?.message?.includes('profile_visits')) {
        console.warn('⚠️ Profile visits table not found. Run migration 010 to enable this feature.');
        return { error: null };
      }
      console.error('Error in trackVisit:', error);
      return { error };
    }
  }

  /**
   * Get recent profile visits by current user
   * Returns profiles ordered by most recent visit
   */
  static async getRecentVisits(limit: number = 10): Promise<{ data: RecentVisitProfile[]; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: [], error: { message: 'Not authenticated' } };
      }

      // Get visits with profile data
      const { data: visits, error } = await supabase
        .from('profile_visits')
        .select(`
          id,
          viewed_user_id,
          visited_at,
          profiles!profile_visits_viewed_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('viewer_id', user.id)
        .order('visited_at', { ascending: false })
        .limit(limit);

      if (error) {
        // Silently handle if table doesn't exist yet
        if (error.code === 'PGRST205' || error.message?.includes('profile_visits')) {
          console.warn('⚠️ Profile visits table not found. Run migration 010 to enable this feature.');
          return { data: [], error: null };
        }
        console.error('Error fetching recent visits:', error);
        return { data: [], error };
      }

      // Transform data to match expected format
      const recentVisits: RecentVisitProfile[] = (visits || [])
        .filter((visit: any) => visit.profiles) // Filter out visits where profile was deleted
        .map((visit: any) => ({
          id: visit.profiles.id,
          username: visit.profiles.username,
          display_name: visit.profiles.display_name,
          avatar_url: visit.profiles.avatar_url,
          visited_at: visit.visited_at,
        }));

      console.log('📋 Recent visits loaded:', recentVisits.length);
      return { data: recentVisits, error: null };
    } catch (error: any) {
      // Silently handle if table doesn't exist
      if (error?.code === 'PGRST205' || error?.message?.includes('profile_visits')) {
        console.warn('⚠️ Profile visits table not found. Run migration 010 to enable this feature.');
        return { data: [], error: null };
      }
      console.error('Error in getRecentVisits:', error);
      return { data: [], error };
    }
  }

  /**
   * Clear all visit history for current user
   */
  static async clearVisitHistory(): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: { message: 'Not authenticated' } };
      }

      const { error } = await supabase
        .from('profile_visits')
        .delete()
        .eq('viewer_id', user.id);

      if (error) {
        console.error('Error clearing visit history:', error);
        return { error };
      }

      console.log('🗑️ Visit history cleared');
      return { error: null };
    } catch (error: any) {
      console.error('Error in clearVisitHistory:', error);
      return { error };
    }
  }

  /**
   * Delete a specific visit from history
   */
  static async deleteVisit(viewedUserId: string): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: { message: 'Not authenticated' } };
      }

      const { error } = await supabase
        .from('profile_visits')
        .delete()
        .eq('viewer_id', user.id)
        .eq('viewed_user_id', viewedUserId);

      if (error) {
        console.error('Error deleting visit:', error);
        return { error };
      }

      console.log('🗑️ Visit deleted:', viewedUserId);
      return { error: null };
    } catch (error: any) {
      console.error('Error in deleteVisit:', error);
      return { error };
    }
  }
}

