import { create } from 'zustand';

interface NavigationState {
  selectedCellType: string | null;
  selectedSubCluster: string | null;
  selectedGene: string | null;
  setSelectedCellType: (cellType: string | null) => void;
  setSelectedSubCluster: (subCluster: string | null) => void;
  setSelectedGene: (gene: string | null) => void;
  reset: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  selectedCellType: null,
  selectedSubCluster: null,
  selectedGene: null,

  setSelectedCellType: (selectedCellType) =>
    set({
      selectedCellType,
      selectedSubCluster: null,
      selectedGene: null,
    }),

  setSelectedSubCluster: (selectedSubCluster) =>
    set({
      selectedSubCluster,
      selectedGene: null,
    }),

  setSelectedGene: (selectedGene) => set({ selectedGene }),

  reset: () =>
    set({
      selectedCellType: null,
      selectedSubCluster: null,
      selectedGene: null,
    }),
}));
