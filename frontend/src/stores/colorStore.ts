/** colorStore — color mode and gene expression */

import { create } from 'zustand';
import { fetchArrowTable } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import type { ColorMode } from '../types/data';

interface ColorStoreState {
  colorMode: ColorMode;
  geneExpr: Float32Array | null;
  signatureScore: Float32Array | null;
  geneName: string | null;
  signatureName: string | null;
  isLoadingGene: boolean;

  setColorMode: (mode: ColorMode) => void;
  loadGene: (name: string) => Promise<boolean>;
  loadSignature: (genes: string[], label?: string) => Promise<boolean>;
}

export const useColorStore = create<ColorStoreState>((set) => ({
  colorMode: 'celltype',
  geneExpr: null,
  signatureScore: null,
  geneName: null,
  signatureName: null,
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
        signatureName: null,
        isLoadingGene: false,
      });
      return true;
    } catch {
      set({ isLoadingGene: false });
      return false;
    }
  },

  loadSignature: async (genes, label) => {
    if (genes.length === 0) return false;
    set({ isLoadingGene: true });
    try {
      const table = await fetchArrowTable(ENDPOINTS.signature, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genes }),
      });
      const expr = table.getChild('expression')!.toArray() as Float32Array;
      set({
        signatureScore: expr,
        signatureName: label ?? `${genes.length}-gene signature`,
        colorMode: 'signature',
        isLoadingGene: false,
      });
      return true;
    } catch {
      set({ isLoadingGene: false });
      return false;
    }
  },
}));
