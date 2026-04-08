/** viewStore — deck.gl viewport state and render mode */

import { create } from 'zustand';
import type { RenderMode } from '../types/data';

export interface ViewState {
  target: [number, number, number];
  zoom: number;
  minZoom: number;
  maxZoom: number;
}

interface ViewStoreState {
  viewState: ViewState;
  renderMode: RenderMode;
  visibleCount: number;

  setViewState: (vs: Partial<ViewState>) => void;
  setVisibleCount: (count: number) => void;
  setRenderMode: (mode: RenderMode) => void;
}

export const useViewStore = create<ViewStoreState>((set) => ({
  viewState: {
    target: [0, 0, 0],
    zoom: 3,
    minZoom: -2,
    maxZoom: 20,
  },
  renderMode: 'density',
  visibleCount: 0,

  setViewState: (vs) =>
    set((state) => ({ viewState: { ...state.viewState, ...vs } })),

  setVisibleCount: (count) => set({ visibleCount: count }),

  setRenderMode: (mode) => set({ renderMode: mode }),
}));
