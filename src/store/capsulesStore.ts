import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { CapsulesState, Capsule, CreateCapsuleData } from '../types';

interface CapsulesStore extends CapsulesState {
  fetchCapsules: () => Promise<void>;
  createCapsule: (data: CreateCapsuleData) => Promise<{ error: any; data: Capsule | null }>;
  updateCapsule: (id: string, updates: Partial<Capsule>) => Promise<{ error: any }>;
  deleteCapsule: (id: string) => Promise<{ error: any }>;
  setSelectedCapsule: (capsule: Capsule | null) => void;
  fetchCapsuleById: (id: string) => Promise<Capsule | null>;
  fetchSharedCapsules: () => Promise<void>;
  shareCapsule: (capsuleId: string, userId: string, permission: 'view' | 'edit') => Promise<{ error: any }>;
  unshareCapsule: (capsuleId: string, userId: string) => Promise<{ error: any }>;
}

export const useCapsulesStore = create<CapsulesStore>((set, get) => ({
  capsules: [],
  loading: false,
  error: null,
  selectedCapsule: null,

  fetchCapsules: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('capsules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ capsules: data || [], loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  createCapsule: async (data) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: capsule, error } = await supabase
        .from('capsules')
        .insert({
          ...data,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert capsule contents
      if (data.contents && data.contents.length > 0) {
        const contentsToInsert = data.contents.map(content => ({
          ...content,
          capsule_id: capsule.id,
        }));

        await supabase
          .from('capsule_contents')
          .insert(contentsToInsert);
      }

      set(state => ({
        capsules: [capsule, ...state.capsules],
      }));

      return { error: null, data: capsule };
    } catch (error) {
      return { error, data: null };
    }
  },

  updateCapsule: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('capsules')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        capsules: state.capsules.map(capsule =>
          capsule.id === id ? { ...capsule, ...updates } : capsule
        ),
      }));

      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  deleteCapsule: async (id) => {
    try {
      const { error } = await supabase
        .from('capsules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        capsules: state.capsules.filter(capsule => capsule.id !== id),
      }));

      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  setSelectedCapsule: (capsule) => {
    set({ selectedCapsule: capsule });
  },

  fetchCapsuleById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('capsules')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching capsule:', error);
      return null;
    }
  },

  fetchSharedCapsules: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('capsules')
        .select('*')
        .in('id', 
          supabase
            .from('shared_capsules')
            .select('capsule_id')
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ capsules: data || [], loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  shareCapsule: async (capsuleId, userId, permission) => {
    try {
      const { error } = await supabase
        .from('shared_capsules')
        .insert({
          capsule_id: capsuleId,
          user_id: userId,
          permission,
        });

      return { error };
    } catch (error) {
      return { error };
    }
  },

  unshareCapsule: async (capsuleId, userId) => {
    try {
      const { error } = await supabase
        .from('shared_capsules')
        .delete()
        .eq('capsule_id', capsuleId)
        .eq('user_id', userId);

      return { error };
    } catch (error) {
      return { error };
    }
  },
}));