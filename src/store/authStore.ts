import { create } from 'zustand';
import { AuthState, User } from '../types';
import { AuthService } from '../lib/auth';

interface AuthStore extends AuthState {
  signIn: (identifier: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, displayName?: string, username?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateEmail: (newEmail: string) => Promise<{ error: any }>;
  updateProfile: (updates: Partial<User>) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

/**
 * Build a minimal User from the session alone — used as a fallback when
 * getCurrentUser() can't load the profile (e.g. a transient network error) so a
 * user with a valid session is never stranded back on the login screen.
 */
function sessionFallbackUser(session: any): User | null {
  const su = session?.user;
  if (!su) return null;
  return {
    id: su.id,
    email: su.email ?? null,
    display_name: su.user_metadata?.display_name ?? null,
    username: su.user_metadata?.username ?? null,
    avatar_url: null,
    created_at: su.created_at ?? new Date().toISOString(),
  } as User;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  loading: true,

  signIn: async (identifier: string, password: string) => {
    try {
      set({ loading: true });
      const { error } = await AuthService.signIn(identifier, password);
      set({ loading: false });
      return { error };
    } catch (error) {
      set({ loading: false });
      return { error };
    }
  },

  signUp: async (email: string, password: string, displayName?: string, username?: string) => {
    try {
      set({ loading: true });
      const { error } = await AuthService.signUp(email, password, displayName, username);
      set({ loading: false });
      return { error };
    } catch (error) {
      set({ loading: false });
      return { error };
    }
  },

  signOut: async () => {
    try {
      set({ loading: true });
      await AuthService.signOut();
      set({ user: null, session: null, loading: false });
    } catch (error) {
      set({ loading: false });
    }
  },

  refreshSession: async () => {
    try {
      set({ loading: true });
      
      // Get current session
      const { session } = await AuthService.getCurrentSession();
      
      if (session?.user) {
        // Get user with profile data
        const { user } = await AuthService.getCurrentUser();
        // Keep the user authenticated even if the profile fetch failed
        // (transient network) — never strand a valid session on the login screen.
        set({ session, user: (user as User) ?? get().user ?? sessionFallbackUser(session), loading: false });
      } else {
        set({ session: null, user: null, loading: false });
      }
    } catch (error) {
      set({ session: null, user: null, loading: false });
    }
  },

  updateEmail: async (newEmail: string) => {
    try {
      const { data, error } = await AuthService.updateEmail(newEmail);
      
      if (!error) {
        // Refresh user data to get updated email
        const { user } = await AuthService.getCurrentUser();
        if (user) {
          set({ user: user as User });
        }
      }
      
      return { error };
    } catch (error) {
      return { error };
    }
  },

  updateProfile: async (updates) => {
    try {
      const { data, error } = await AuthService.updateProfile(updates);
      
      if (!error && data) {
        set({ user: { ...get().user, ...data } as User });
      }
      
      return { error };
    } catch (error) {
      return { error };
    }
  },

  resetPassword: async (email: string) => {
    try {
      const { error } = await AuthService.resetPassword(email);
      return { error };
    } catch (error) {
      return { error };
    }
  },
}));

// Listen for auth changes.
// IMPORTANT: calling supabase auth/data methods synchronously inside this
// callback deadlocks the auth lock (the callback runs while the lock is held),
// which freezes sign-in and the whole app. Defer the work with setTimeout(0)
// so it runs outside the lock context. (Documented supabase-js pitfall.)
AuthService.onAuthStateChange((event, session) => {
  setTimeout(async () => {
    if (session?.user) {
      const { user } = await AuthService.getCurrentUser();
      useAuthStore.setState({
        session,
        user: (user as User) ?? useAuthStore.getState().user ?? sessionFallbackUser(session),
        loading: false,
      });
    } else {
      useAuthStore.setState({ session: null, user: null, loading: false });
    }
  }, 0);
});