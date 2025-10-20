import { supabase } from './supabase';
import { User } from '../types';

export class AuthService {
  // Sign up with email and password
  static async signUp(email: string, password: string, displayName?: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) throw error;

      // Create profile record - wait a bit for auth.users to be created
      if (data.user) {
        // Wait a bit for the user to be fully created
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if profile already exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (!existingProfile) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: data.user.id,
            display_name: displayName || email.split('@')[0],
          });

          if (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't fail signup if profile creation fails
          }
        }
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Sign in with email and password
  static async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Legacy magic link method (keeping for reference)
  static async signInWithMagicLink(email: string) {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: 'timecapsule://auth/callback',
        },
      });

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Sign out
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    }
  }

  // Get current session
  static async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      return { session, error };
    } catch (error) {
      return { session: null, error };
    }
  }

  // Get current user with profile
  static async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (!user) return { user: null, error: null };

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        // Create profile if it doesn't exist
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
        });

        if (!insertError) {
          // Fetch the newly created profile
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (newProfile) {
            return { user: newProfile, error: null };
          }
        }
      }

      return { 
        user: profile || {
          id: user.id,
          email: user.email || '',
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
          created_at: user.created_at,
        }, 
        error: null 
      };
    } catch (error) {
      return { user: null, error };
    }
  }

  // Update user profile
  static async updateProfile(updates: Partial<User>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Reset password
  static async resetPassword(email: string) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'timecapsule://auth/reset-password',
      });

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Listen to auth state changes
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}