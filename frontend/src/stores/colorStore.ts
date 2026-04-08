/** colorStore — color mode and gene expression */

import { create } from 'zustand';
import { fetchArrowTable } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import type { ColorMode } from '../types/data';

interface ColorStoreState {
  colorMode: ColorMode;
  geneExpr: Float32Array | null;
  geneName: string | null;
  isLoadingGene: boolean;

  setColorMode: (mode: ColorMode) => void;
  loadGene: (name: string) => Promise<boolean>;
}

export const useColorStore = create<ColorStoreState>((set) => ({
  colorMode: 'celltype',
  geneExpr: null,
  geneName: null,
  isLoadingGene: false,

  setColorMode: (mode) => set({ colorMode: mode }),

  loadGene: async (name) => {
    set({ isLoadingGene: true });
    try {
      const table = await fetchArrowTable(ENDPOINTS.gene(name));
      const expr = table.getChild('expression')!.toArray() as Float32Array;
      set({
        geneExpr: expr,
        geneName: name.toUpperCase(),
        colorMode: 'gene',
        isLoadingGene: false,
      });
      return true;
    } catch {
      set({ isLoadingGene: false });
      return false;
    }
  },
}));
