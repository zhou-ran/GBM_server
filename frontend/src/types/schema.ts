/** Schema JSON type definitions — mirrors data/processed/schema.json */

export interface ColumnDef {
  name: string;
  categories: string[];
  n_categories: number;
  dtype?: 'uint8' | 'uint16';
}

export interface UmapBounds {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

export interface Schema {
  n_cells: number;
  columns: ColumnDef[];
  umap_bounds: UmapBounds;
}
