import { useMemo } from 'react';
import { useDataStore } from '../../stores/dataStore';

export function SummaryStatsBar() {
  const nCells = useDataStore((s) => s.nCells);
  const schema = useDataStore((s) => s.schema);
  const centroids = useDataStore((s) => s.centroids);
  const globalStats = useDataStore((s) => s.globalStats);

  const donorCount = schema?.columns.find((column) => column.name === 'donor_id')?.categories.length ?? 0;
  const meanSenescence = useMemo(() => {
    const total = centroids.reduce((sum, centroid) => sum + centroid.count, 0);
    const weighted = centroids.reduce((sum, centroid) => sum + centroid.senescence_mean * centroid.count, 0);
    return total > 0 ? weighted / total : 0;
  }, [centroids]);

  const ageStats = globalStats?.by_column.age_Group5565 ?? {};
  const idhStats = globalStats?.by_column.IDH ?? {};

  return (
    <div className="grid grid-cols-5 gap-3 border-t border-[var(--border)] bg-[#0e1621] px-4 py-3 text-sm">
      <div className="rounded-xl bg-white/4 px-3 py-2">
        <div className="text-[var(--text-muted)]">Cell Types</div>
        <div className="mt-1 font-medium">{(globalStats?.by_column.CellType && Object.keys(globalStats.by_column.CellType).length) || 0}</div>
      </div>
      <div className="rounded-xl bg-white/4 px-3 py-2">
        <div className="text-[var(--text-muted)]">Total Cells</div>
        <div className="mt-1 font-medium">{nCells.toLocaleString()}</div>
      </div>
      <div className="rounded-xl bg-white/4 px-3 py-2">
        <div className="text-[var(--text-muted)]">Donors</div>
        <div className="mt-1 font-medium">{donorCount.toLocaleString()}</div>
      </div>
      <div className="rounded-xl bg-white/4 px-3 py-2">
        <div className="text-[var(--text-muted)]">IDH Split</div>
        <div className="mt-1 font-medium">
          WT {idhStats.WT ?? 0} / Mut {idhStats.IDH ?? 0}
        </div>
      </div>
      <div className="rounded-xl bg-white/4 px-3 py-2">
        <div className="text-[var(--text-muted)]">Age + Senescence</div>
        <div className="mt-1 font-medium">
          {ageStats['<=55'] ?? 0} | {ageStats['55-65'] ?? 0} | {ageStats['>=65'] ?? 0}
          <span className="ml-2 text-[var(--text-muted)]">mean {meanSenescence.toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
}
