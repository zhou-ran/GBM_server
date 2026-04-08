/** uiStore — loading state, active tab, selected donor */

import { create } from 'zustand';

interface UIStoreState {
  isLoading: boolean;
  loadingMessage: string;
  levelLoading: Record<number, boolean>;
  levelProgress: Record<number, string>;
  activeTab: 'waterfall' | 'correlation';
  selectedDonor: string | null;

  setLoading: (loading: boolean, message?: string) => void;
  setLevelLoading: (level: number, loading: boolean, message?: string) => void;
  setActiveTab: (tab: 'waterfall' | 'correlation') => void;
  setSelectedDonor: (donor: string | null) => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  isLoading: true,
  loadingMessage: 'Initializing...',
  levelLoading: { 1: true },
  levelProgress: { 1: 'Initializing...' },
  activeTab: 'waterfall',
  selectedDonor: null,

  setLoading: (loading, message = '') =>
    set((state) => ({
      isLoading: loading,
      loadingMessage: message,
      levelLoading: { ...state.levelLoading, 0: loading },
      levelProgress: { ...state.levelProgress, 0: message },
    })),
  setLevelLoading: (level, loading, message = '') =>
    set((state) => {
      const levelLoading = { ...state.levelLoading, [level]: loading };
      const levelProgress = { ...state.levelProgress, [level]: message };
      const activeLevels = Object.entries(levelLoading).filter(([, value]) => value);
      const highestActive = activeLevels
        .map(([key]) => Number(key))
        .sort((a, b) => b - a)[0];

      return {
        levelLoading,
        levelProgress,
        isLoading: activeLevels.length > 0,
        loadingMessage: highestActive ? levelProgress[highestActive] ?? '' : '',
      };
    }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedDonor: (donor) => set({ selectedDonor: donor }),
}));
