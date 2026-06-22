import { supabase } from '../lib/supabase';

// New table (migration 0008) isn't in the generated Database type yet.
const db: any = supabase;

export interface UserPreferences {
  notif_push: boolean;
  notif_email: boolean;
  notif_marketing: boolean;
  privacy_public: boolean;
  privacy_location: boolean;
  privacy_messages: boolean;
  home_layout: 'map' | 'split' | 'feed';
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  notif_push: true,
  notif_email: false,
  notif_marketing: false,
  privacy_public: true,
  privacy_location: true,
  privacy_messages: true,
  home_layout: 'map',
};

export class PreferencesService {
  /** Load the current user's preferences, falling back to defaults. */
  static async get(): Promise<UserPreferences> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { ...DEFAULT_PREFERENCES };
      const { data } = await db.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle();
      if (!data) return { ...DEFAULT_PREFERENCES };
      return { ...DEFAULT_PREFERENCES, ...data };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  /** Upsert a partial set of preference changes. */
  static async update(patch: Partial<UserPreferences>): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };
      const { error } = await db
        .from('user_preferences')
        .upsert({ user_id: user.id, ...patch, updated_at: new Date().toISOString() } as any, { onConflict: 'user_id' });
      return { error };
    } catch (error) {
      return { error };
    }
  }
}
