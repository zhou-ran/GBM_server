import { create } from 'zustand';
import { fetchArrowTable, fetchJSON } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import type { CellChatData, TrajectoryGenes } from '../types/data';

interface TrajectoryState {
  pseudotime: Float32Array | null;
  trajectoryGenes: TrajectoryGenes | null;
  cellchat: CellChatData | null;
  selectedPathway: string;
  mode: 'pseudotime' | 'cellchat';
  isLoading: boolean;
  error: string | null;
  loadTrajectory: (cellType: string) => Promise<void>;
  loadCellchat: () => Promise<void>;
  setMode: (mode: 'pseudotime' | 'cellchat') => void;
  setSelectedPathway: (pathway: string) => void;
}

export const useTrajectoryStore = create<TrajectoryState>((set, get) => ({
  pseudotime: null,
  trajectoryGenes: null,
  cellchat: null,
  selectedPathway: 'All',
  mode: 'pseudotime',
  isLoading: false,
  error: null,

  setMode: (mode) => set({ mode }),
  setSelectedPathway: (selectedPathway) => set({ selectedPathway }),

  loadTrajectory: async (cellType) => {
    if (!cellType) return;
    set({ isLoading: true, error: null });
    try {
      const [table, genes] = await Promise.all([
        fetchArrowTable(ENDPOINTS.trajectory(cellType)),
        fetchJSON<TrajectoryGenes>(ENDPOINTS.trajectoryGenes(cellType)).catch(() => null),
      ]);
      set({
        pseudotime: table.getChild('pseudotime')!.toArray() as Float32Array,
        trajectoryGenes: genes,
        isLoading: false,
      });
    } catch (error) {
      set({
        pseudotime: null,
        trajectoryGenes: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Trajectory load failed',
      });
    }
  },

  loadCellchat: async () => {
    if (get().cellchat) return;
    set({ isLoading: true, error: null });
    try {
      const cellchat = await fetchJSON<CellChatData>(ENDPOINTS.cellchat);
      set({ cellchat, isLoading: false });
    } catch (error) {
      set({
        cellchat: { nodes: [], edges: [], pairs: [] },
        isLoading: false,
        error: error instanceof Error ? error.message : 'CellChat load failed',
      });
    }
  },
}));
