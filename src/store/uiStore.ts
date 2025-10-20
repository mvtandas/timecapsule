import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UIState } from '../types';

interface UIStore extends UIState {
  setTheme: (theme: 'light' | 'dark') => void;
  setActiveTab: (tab: string) => void;
  setNetworkStatus: (status: 'online' | 'offline') => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      activeTab: 'Dashboard',
      networkStatus: 'online',

      setTheme: (theme) => {
        set({ theme });
      },

      setActiveTab: (tab) => {
        set({ activeTab: tab });
      },

      setNetworkStatus: (status) => {
        set({ networkStatus: status });
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        set({ theme: currentTheme === 'light' ? 'dark' : 'light' });
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        activeTab: state.activeTab,
      }),
    }
  )
);