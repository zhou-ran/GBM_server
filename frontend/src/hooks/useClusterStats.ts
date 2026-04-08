import { useMemo } from 'react';
import { useDataStore } from '../stores/dataStore';
import { useFilterStore } from '../stores/filterStore';
import { useNavigationStore } from '../stores/navigationStore';

interface ClusterPoint {
  index: number;
  position: [number, number];
  subtype: string;
  subtypeCode: number;
  senescence: number;
  donorCode: number;
}

interface ClusterCentroid {
  label: string;
  x: number;
  y: number;
  count: number;
  senescenceMean: number;
}

export function useClusterStats() {
  const coords = useDataStore((s) => s.coords);
  const senescence = useDataStore((s) => s.senescence);
  const cellType2Codes = useDataStore((s) => s.cellType2Codes);
  const donorCodes = useDataStore((s) => s.donorCodes);
  const schema = useDataStore((s) => s.schema);
  const patients = useDataStore((s) => s.patients);
  const deResults = useDataStore((s) => s.deResults);
  const filterMask = useFilterStore((s) => s.filterMask);
  const selectedCellType = useNavigationStore((s) => s.selectedCellType);

  return useMemo(() => {
    if (!coords || !senescence || !cellType2Codes || !donorCodes || !filterMask || !schema || !selectedCellType) {
      return {
        points: [] as ClusterPoint[],
        subtypeCounts: {} as Record<string, number>,
        subtypeSenescence: {} as Record<string, number[]>,
        centroids: [] as ClusterCentroid[],
        filteredPatients: [],
        deGenes: [],
        selectedCellType,
      };
    }

    const subtypeCategories = schema.columns.find((column) => column.name === 'CellType_Level2')?.categories ?? [];
    const donorCategories = schema.columns.find((column) => column.name === 'donor_id')?.categories ?? [];
    const subtypeCounts: Record<string, number> = {};
    const subtypeSenescence: Record<string, number[]> = {};
    const centroidBuckets = new Map<string, { x: number; y: number; count: number; senescence: number }>();
    const points: ClusterPoint[] = [];

    for (let index = 0; index < filterMask.length; index++) {
      if (!filterMask[index]) continue;

      const subtypeCode = cellType2Codes[index];
      const subtype = subtypeCategories[subtypeCode] ?? `Subtype ${subtypeCode}`;
      const pointSenescence = senescence[index];
      const x = coords[index * 2];
      const y = coords[index * 2 + 1];

      points.push({
        index,
        position: [x, y],
        subtype,
        subtypeCode,
        senescence: pointSenescence,
        donorCode: donorCodes[index],
      });

      subtypeCounts[subtype] = (subtypeCounts[subtype] ?? 0) + 1;
      subtypeSenescence[subtype] = subtypeSenescence[subtype] ?? [];
      subtypeSenescence[subtype].push(pointSenescence);

      const bucket = centroidBuckets.get(subtype) ?? { x: 0, y: 0, count: 0, senescence: 0 };
      bucket.x += x;
      bucket.y += y;
      bucket.count += 1;
      bucket.senescence += pointSenescence;
      centroidBuckets.set(subtype, bucket);
    }

    const centroids = Array.from(centroidBuckets.entries())
      .map(([label, bucket]) => ({
        label,
        x: bucket.x / bucket.count,
        y: bucket.y / bucket.count,
        count: bucket.count,
        senescenceMean: bucket.senescence / bucket.count,
      }))
      .sort((a, b) => b.count - a.count);

    const filteredPatients = patients
      .filter((patient) => (patient.celltype_counts?.[selectedCellType] ?? 0) > 0)
      .map((patient) => ({
        ...patient,
        n_cells: patient.celltype_counts?.[selectedCellType] ?? patient.n_cells,
        donorIndex: donorCategories.indexOf(patient.donor_id),
      }))
      .sort((a, b) => b.n_cells - a.n_cells);

    return {
      points,
      subtypeCounts,
      subtypeSenescence,
      centroids,
      filteredPatients,
      deGenes: deResults[selectedCellType] ?? [],
      selectedCellType,
    };
  }, [coords, deResults, donorCodes, filterMask, patients, schema, selectedCellType, senescence, cellType2Codes]);
}
