/** Schema JSON type definitions — mirrors data/processed/schema.json */

export type MetaDType = 'uint8' | 'uint16';

export interface ColumnDef {
  name: string;
  categories: string[];
  n_categories: number;
  dtype?: MetaDType;
  itemsize?: number;
  byte_offset?: number;
  byte_length?: number;
}

export interface UmapBounds {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

export interface MetaLayout {
  format: string;
  total_bytes: number;
}

export interface Schema {
  n_cells: number;
  columns: ColumnDef[];
  umap_bounds: UmapBounds;
  meta_layout?: MetaLayout;
}
