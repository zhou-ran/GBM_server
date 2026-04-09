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
  age?: number;
  senescence_mean: number;
  celltype_counts?: Record<string, number>;
}

export interface DEGene {
  gene: string;
  log2fc?: number;
  logfc?: number;
  score?: number;
  pval?: number;
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

export type ColorMode = 'celltype' | 'celltype2' | 'senescence' | 'gene' | 'signature' | 'age' | 'idh';

export type RenderMode = 'overview' | 'density' | 'detail';

export interface TrajectoryGeneTrend {
  gene: string;
  mean_expression: (number | null)[];
}

export interface TrajectoryGenes {
  celltype?: string;
  n_cells?: number;
  n_cells_used?: number;
  bins: number[];
  genes: TrajectoryGeneTrend[];
}

export interface CellChatNode {
  id: string;
  label: string;
}

export interface CellChatEdge {
  source: string;
  target: string;
  ligand: string;
  receptor: string;
  pair: string;
  pathway: string;
  score: number;
}

export interface CellChatPair {
  pair: string;
  pathway: string;
  scores: Array<{ source: string; target: string; score: number }>;
}

export interface CellChatData {
  nodes: CellChatNode[];
  edges: CellChatEdge[];
  pairs: CellChatPair[];
}
