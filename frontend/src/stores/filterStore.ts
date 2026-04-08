/** filterStore — filter mask and active filter state */

import { create } from 'zustand';
import type { Schema } from '../types/schema';

interface FilterStoreState {
  activeFilters: Record<string, Set<number>>;
  filterMask: Uint8Array | null;
  highlightedDonor: number | null;
  filterableColumns: string[];

  initFilters: (schema: Schema, metaColumns: Record<string, Uint8Array>) => void;
  toggleCategory: (column: string, catIdx: number) => void;
  setCellTypeFilter: (cellType: string | null) => void;
  highlightDonor: (donorIdx: number | null) => void;
  hasActiveFilters: () => boolean;
}

// Columns available for filtering (uint8 only, small cardinality)
const FILTERABLE = ['CellType', 'CellType_Level2', 'IDH', 'stage', 'age_Group5565', 'sex'];

let _metaColumnsRef: Record<string, Uint8Array> = {};
let _nCells = 0;
let _schemaRef: Schema | null = null;

function rebuildMask(
  activeFilters: Record<string, Set<number>>,
  highlightedDonor: number | null,
): Uint8Array {
  const mask = new Uint8Array(_nCells).fill(1);

  // Apply category filters
  for (const colName of Object.keys(activeFilters)) {
    const active = activeFilters[colName];
    if (active.size === 0) continue;
    const codes = _metaColumnsRef[colName];
    if (!codes) continue;
    for (let i = 0; i < _nCells; i++) {
      if (mask[i] && !active.has(codes[i])) {
        mask[i] = 0;
      }
    }
  }

  // Donor highlight overrides
  if (highlightedDonor !== null) {
    const donorCodes = _metaColumnsRef['donor_id'];
    if (donorCodes) {
      for (let i = 0; i < _nCells; i++) {
        if (mask[i] && donorCodes[i] !== highlightedDonor) {
          mask[i] = 0;
        }
      }
    }
  }

  return mask;
}

export const useFilterStore = create<FilterStoreState>((set, get) => ({
  activeFilters: {},
  filterMask: null,
  highlightedDonor: null,
  filterableColumns: FILTERABLE,

  initFilters: (schema, metaColumns) => {
    _schemaRef = schema;
    _nCells = schema.n_cells;
    _metaColumnsRef = metaColumns as Record<string, Uint8Array>;
    const mask = new Uint8Array(_nCells).fill(1);
    set({ filterMask: mask, activeFilters: {} });
  },

  toggleCategory: (column, catIdx) => {
    const state = get();
    const current = state.activeFilters[column] ?? new Set<number>();
    const next = new Set(current);
    if (next.has(catIdx)) {
      next.delete(catIdx);
    } else {
      next.add(catIdx);
    }
    const newFilters = { ...state.activeFilters, [column]: next };
    const mask = rebuildMask(newFilters, state.highlightedDonor);
    set({ activeFilters: newFilters, filterMask: mask });
  },

  setCellTypeFilter: (cellType) => {
    const state = get();
    const categories = _schemaRef?.columns.find((column) => column.name === 'CellType')?.categories ?? [];
    const nextFilters = { ...state.activeFilters };

    if (!cellType) {
      delete nextFilters.CellType;
    } else {
      const idx = categories.indexOf(cellType);
      if (idx >= 0) {
        nextFilters.CellType = new Set([idx]);
      }
    }

    const mask = rebuildMask(nextFilters, state.highlightedDonor);
    set({ activeFilters: nextFilters, filterMask: mask });
  },

  highlightDonor: (donorIdx) => {
    const state = get();
    const mask = rebuildMask(state.activeFilters, donorIdx);
    set({ highlightedDonor: donorIdx, filterMask: mask });
  },

  hasActiveFilters: () => {
    const { activeFilters, highlightedDonor } = get();
    if (highlightedDonor !== null) return true;
    return Object.values(activeFilters).some((s) => s.size > 0);
  },
}));
