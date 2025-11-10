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
        set({ session, user, loading: false });
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
          set({ user });
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

// Listen for auth changes
AuthService.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    // Get user with profile data
    const { user } = await AuthService.getCurrentUser();
    useAuthStore.setState({
      session,
      user,
      loading: false
    });
  } else {
    useAuthStore.setState({ session: null, user: null, loading: false });
  }
});