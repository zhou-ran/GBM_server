/** dataStore — cell atlas data loaded from Arrow IPC + JSON endpoints */

import { create } from 'zustand';
import { fetchArrowTable, fetchJSON } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import type { Schema } from '../types/schema';
import type {
  Centroid,
  CorrelationData,
  DEGene,
  GlobalStats,
  HexbinData,
  Patient,
} from '../types/data';

interface DataState {
  // Typed arrays from Arrow IPC (set once at init)
  coords: Float32Array | null; // interleaved [x0,y0,x1,y1,...]
  senescence: Float32Array | null;
  cellTypeCodes: Uint8Array | null;
  cellType2Codes: Uint8Array | null;
  idhCodes: Uint8Array | null;
  stageCodes: Uint8Array | null;
  ageCodes: Uint8Array | null;
  sexCodes: Uint8Array | null;
  donorCodes: Uint16Array | null;
  sampleCodes: Uint16Array | null;

  // Schema and pre-computed JSON data
  schema: Schema | null;
  hexbin: HexbinData | null;
  centroids: Centroid[];
  globalStats: GlobalStats | null;
  patients: Patient[];
  deResults: Record<string, DEGene[]>;
  correlation: CorrelationData | null;
  nCells: number;
  isLevel1Loaded: boolean;
  isLevel2Loaded: boolean;

  // Actions
  loadLevel1: (onProgress?: (msg: string) => void) => Promise<void>;
  loadLevel2: (onProgress?: (msg: string) => void) => Promise<void>;
}

export const useDataStore = create<DataState>((set) => ({
  coords: null,
  senescence: null,
  cellTypeCodes: null,
  cellType2Codes: null,
  idhCodes: null,
  stageCodes: null,
  ageCodes: null,
  sexCodes: null,
  donorCodes: null,
  sampleCodes: null,
  schema: null,
  hexbin: null,
  centroids: [],
  globalStats: null,
  patients: [],
  deResults: {},
  correlation: null,
  nCells: 0,
  isLevel1Loaded: false,
  isLevel2Loaded: false,

  loadLevel1: async (onProgress) => {
    if (useDataStore.getState().isLevel1Loaded) return;

    onProgress?.('Loading schema...');
    const schema = await fetchJSON<Schema>(ENDPOINTS.schema);
    set({ schema, nCells: schema.n_cells });

    onProgress?.('Loading aggregated atlas...');
    const [hexbin, centroids, globalStats] = await Promise.all([
      fetchJSON<HexbinData>(ENDPOINTS.hexbin).catch(() => null),
      fetchJSON<Centroid[]>(ENDPOINTS.centroids).catch(() => []),
      fetchJSON<GlobalStats>(ENDPOINTS.stats).catch(() => null),
    ]);

    set({
      hexbin,
      centroids,
      globalStats,
      isLevel1Loaded: true,
    });
  },

  loadLevel2: async (onProgress) => {
    if (useDataStore.getState().isLevel2Loaded) return;

    onProgress?.('Loading cell data...');
    const [cellTable, patients, deResults, correlation] = await Promise.all([
      fetchArrowTable(ENDPOINTS.cells),
      fetchJSON<Patient[]>(ENDPOINTS.patients).catch(() => []),
      fetchJSON<Record<string, DEGene[]>>(ENDPOINTS.de).catch(() => ({})),
      fetchJSON<CorrelationData>(ENDPOINTS.correlation).catch(() => null),
    ]);

    onProgress?.('Processing data...');
    const x = cellTable.getChild('x')!.toArray() as Float32Array;
    const y = cellTable.getChild('y')!.toArray() as Float32Array;

    // Interleave x,y for deck.gl
    const n = x.length;
    const coords = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      coords[i * 2] = x[i];
      coords[i * 2 + 1] = y[i];
    }

    set({
      coords,
      senescence: cellTable.getChild('senescence')!.toArray() as Float32Array,
      cellTypeCodes: cellTable.getChild('CellType')!.toArray() as Uint8Array,
      cellType2Codes: cellTable.getChild('CellType_Level2')!.toArray() as Uint8Array,
      idhCodes: cellTable.getChild('IDH')!.toArray() as Uint8Array,
      stageCodes: cellTable.getChild('stage')!.toArray() as Uint8Array,
      ageCodes: cellTable.getChild('age_Group5565')!.toArray() as Uint8Array,
      sexCodes: cellTable.getChild('sex')!.toArray() as Uint8Array,
      donorCodes: cellTable.getChild('donor_id')!.toArray() as Uint16Array,
      sampleCodes: cellTable.getChild('Sample')!.toArray() as Uint16Array,
      patients,
      deResults,
      correlation,
      isLevel2Loaded: true,
    });
  },
}));
