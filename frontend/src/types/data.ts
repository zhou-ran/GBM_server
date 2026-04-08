/** Cell data and analysis types */

export interface Centroid {
  name: string;
  x: number;
  y: number;
  count: number;
  senescence_mean: number;
  senescence_std: number;
}

export interface HexbinBin {
  x: number;
  y: number;
  count: number;
  senescence_mean: number;
  dominant_celltype: number;
  celltype_counts: number[];
}

export interface HexbinData {
  bins: HexbinBin[];
  radius: number;
  celltype_names: string[];
}

export interface Patient {
  donor_id: string;
  n_cells: number;
  IDH: string;
  stage: string;
  age_group: string;
  sex: string;
  senescence_mean: number;
}

export interface DEGene {
  gene: string;
  log2fc: number;
  pval: number;
  pval_adj: number;
}

export interface CorrelationData {
  labels: string[];
  matrix: number[][];
}

export interface GlobalStats {
  total: number;
  by_column: Record<string, Record<string, number>>;
}

export type ColorMode = 'celltype' | 'celltype2' | 'senescence' | 'gene' | 'age' | 'idh';

export type RenderMode = 'overview' | 'density' | 'detail';
