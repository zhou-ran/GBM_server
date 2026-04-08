import { create } from 'zustand';

export interface BreadcrumbEntry {
  level: 1 | 2 | 3 | 4;
  label: string;
}

export interface DrillDownTarget {
  level: 1 | 2 | 3 | 4;
  cellType?: string | null;
  subCluster?: string | null;
  gene?: string | null;
  label?: string | null;
}

interface NavigationState {
  currentLevel: 1 | 2 | 3 | 4;
  history: BreadcrumbEntry[];
  selectedCellType: string | null;
  selectedSubCluster: string | null;
  selectedGene: string | null;
  drillDown: (target: DrillDownTarget) => void;
  navigateBack: (toLevel: number) => void;
  reset: () => void;
}

const ROOT_ENTRY: BreadcrumbEntry = { level: 1, label: 'Global Atlas' };

function buildHistory(
  level: 1 | 2 | 3 | 4,
  selectedCellType: string | null,
  selectedSubCluster: string | null,
  selectedGene: string | null,
  label?: string | null,
): BreadcrumbEntry[] {
  const history: BreadcrumbEntry[] = [ROOT_ENTRY];
  if (level >= 2 && selectedCellType) history.push({ level: 2, label: selectedCellType });
  if (level >= 3) history.push({ level: 3, label: label ?? selectedSubCluster ?? selectedGene ?? 'Gene & Signature' });
  if (level >= 4) history.push({ level: 4, label: label ?? 'Trajectory' });
  return history;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  currentLevel: 1,
  history: [ROOT_ENTRY],
  selectedCellType: null,
  selectedSubCluster: null,
  selectedGene: null,

  drillDown: (target) => {
    const state = get();
    const level = target.level;
    const selectedCellType = target.cellType ?? state.selectedCellType;
    const selectedSubCluster =
      level >= 3 ? target.subCluster ?? state.selectedSubCluster : null;
    const selectedGene = level >= 3 ? target.gene ?? state.selectedGene : null;

    set({
      currentLevel: level,
      selectedCellType: level >= 2 ? selectedCellType ?? null : null,
      selectedSubCluster: level >= 3 ? selectedSubCluster ?? null : null,
      selectedGene: level >= 3 ? selectedGene ?? null : null,
      history: buildHistory(
        level,
        level >= 2 ? selectedCellType ?? null : null,
        level >= 3 ? selectedSubCluster ?? null : null,
        level >= 3 ? selectedGene ?? null : null,
        target.label,
      ),
    });
  },

  navigateBack: (toLevel) =>
    set((state) => {
      const level = Math.max(1, Math.min(4, toLevel)) as 1 | 2 | 3 | 4;
      const selectedCellType = level >= 2 ? state.selectedCellType : null;
      const selectedSubCluster = level >= 3 ? state.selectedSubCluster : null;
      const selectedGene = level >= 3 ? state.selectedGene : null;

      return {
        currentLevel: level,
        selectedCellType,
        selectedSubCluster,
        selectedGene,
        history: buildHistory(level, selectedCellType, selectedSubCluster, selectedGene),
      };
    }),

  reset: () =>
    set({
      currentLevel: 1,
      history: [ROOT_ENTRY],
      selectedCellType: null,
      selectedSubCluster: null,
      selectedGene: null,
    }),
}));
