import { create } from 'zustand';
import { AuthState, User } from '../types';
import { AuthService } from '../lib/auth';

interface AuthStore extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  loading: true,

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true });
      const { error } = await AuthService.signIn(email, password);
      set({ loading: false });
      return { error };
    } catch (error) {
      set({ loading: false });
      return { error };
    }
  },

  signUp: async (email: string, password: string, displayName?: string) => {
    try {
      set({ loading: true });
      const { error } = await AuthService.signUp(email, password, displayName);
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

  updateProfile: async (updates) => {
    try {
      const { data, error } = await AuthService.updateProfile(updates);
      
      if (!error && data) {
        set({ user: { ...get().user, ...data } });
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