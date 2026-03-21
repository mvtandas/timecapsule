import { supabase } from './supabase';
import { User } from '../types';

export class AuthService {
  // Sign up with email and password
  static async signUp(email: string, password: string, displayName?: string, username?: string) {
    try {
      // First, check if username is already taken
      if (username) {
        const { data: existingUsername } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.toLowerCase())
          .maybeSingle();

        if (existingUsername) {
          throw new Error('Username is already taken');
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            username: username,
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
          .maybeSingle();

        if (!existingProfile) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: data.user.id,
            display_name: displayName || email.split('@')[0],
            username: username?.toLowerCase() || null,
            email: email, // Store email for username lookup
          } as any);

          if (profileError) {
            if (__DEV__) console.error('Profile creation error:', profileError);
            // Check if it's a username uniqueness error
            if (profileError.message?.toLowerCase().includes('username')) {
              throw new Error('Username is already taken');
            }
            // Don't fail signup if profile creation fails for other reasons
          }
        }
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Sign in with email or username and password
  static async signIn(identifier: string, password: string) {
    try {
      // Check if identifier is an email or username
      const isEmail = identifier.includes('@');
      
      let email = identifier;
      
      // If it's a username, look up the email from profiles table
      if (!isEmail) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', identifier.toLowerCase())
          .maybeSingle();

        if (profileError || !profile || !(profile as any).email) {
          throw new Error('Username not found. Please check your username or use your email to login.');
        }
        
        email = (profile as any).email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Provide a clearer error message
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid username/email or password');
        }
        throw error;
      }

      return { data, error: null };
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
        .maybeSingle();

      if (profileError || !profile) {
        // Create profile if it doesn't exist
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
        } as any);

        if (!insertError) {
          // Fetch the newly created profile
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          
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

  // Update user email (requires auth update)
  static async updateEmail(newEmail: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) throw error;

      // Also update email in profiles table
      if (data.user) {
        await supabase
          .from('profiles')
          .update({ email: newEmail } as any)
          .eq('id', data.user.id);
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Update user profile
  static async updateProfile(updates: Partial<User>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user logged in');

      // If username is being updated, check if it's already taken
      if (updates.username) {
        const { data: existingUsername } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', updates.username.toLowerCase())
          .neq('id', user.id) // Exclude current user
          .maybeSingle();

        if (existingUsername) {
          throw new Error('Username is already taken');
        }
      }

      // Prepare updates with lowercase username
      const profileUpdates = {
        ...updates,
        username: updates.username ? updates.username.toLowerCase() : updates.username,
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(profileUpdates as any)
        .eq('id', user.id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Change password (for authenticated users)
  static async changePassword(newPassword: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      return { data, error: null };
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

  // Delete user account and all data
  static async deleteAccount(): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete user's data in order (respecting foreign keys)
      await supabase.from('comments').delete().eq('user_id', user.id);
      await supabase.from('likes').delete().eq('user_id', user.id);
      await supabase.from('notifications').delete().eq('user_id', user.id);
      await supabase.from('notifications').delete().eq('from_user_id', user.id);
      await supabase.from('friend_requests').delete().or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      await supabase.from('shared_capsules').delete().eq('user_id', user.id);
      await supabase.from('capsule_contents').delete().in('capsule_id',
        (await supabase.from('capsules').select('id').eq('owner_id', user.id)).data?.map((c: any) => c.id) || []
      );
      await supabase.from('capsules').delete().eq('owner_id', user.id);
      await supabase.from('profiles').delete().eq('id', user.id);

      // Sign out
      await supabase.auth.signOut();

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // Listen to auth state changes
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}