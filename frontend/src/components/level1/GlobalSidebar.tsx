import { useMemo } from 'react';
import { useDataStore } from '../../stores/dataStore';
import { useColorStore } from '../../stores/colorStore';
import { MiniHistogram } from '../common/MiniHistogram';
import { CompositionChart } from './CompositionChart';

const LEVEL1_OPTIONS = [
  { value: 'celltype', label: 'Cell Type', enabled: true },
  { value: 'age', label: 'Age', enabled: false },
  { value: 'idh', label: 'IDH', enabled: false },
  { value: 'senescence', label: 'Senescence', enabled: true },
] as const;

export function GlobalSidebar() {
  const globalStats = useDataStore((s) => s.globalStats);
  const centroids = useDataStore((s) => s.centroids);
  const colorMode = useColorStore((s) => s.colorMode);
  const setColorMode = useColorStore((s) => s.setColorMode);

  const composition = globalStats?.by_column.CellType ?? {};
  const patientStats = useMemo(
    () => [
      { label: 'IDH-WT', value: globalStats?.by_column.IDH?.WT ?? 0 },
      { label: 'IDH-mut', value: globalStats?.by_column.IDH?.IDH ?? 0 },
      { label: '<=55', value: globalStats?.by_column.age_Group5565?.['<=55'] ?? 0 },
      { label: '55-65', value: globalStats?.by_column.age_Group5565?.['55-65'] ?? 0 },
      { label: '>=65', value: globalStats?.by_column.age_Group5565?.['>=65'] ?? 0 },
    ],
    [globalStats],
  );

  const histogramValues = useMemo(() => {
    if (centroids.length === 0) return [0, 0, 0, 0, 0];
    return centroids
      .map((centroid) => centroid.senescence_mean)
      .sort((a, b) => a - b)
      .reduce<number[]>((bins, value) => {
        const index = Math.min(bins.length - 1, Math.floor(value * bins.length));
        bins[index] += 1;
        return bins;
      }, [0, 0, 0, 0, 0]);
  }, [centroids]);

  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[#0f1722] px-4 py-4">
      <section className="rounded-2xl border border-[var(--border)] bg-white/3 p-4">
        <h3 className="mb-3 text-sm font-semibold">Color By</h3>
        <div className="space-y-2">
          {LEVEL1_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                colorMode === option.value ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)]'
              } ${option.enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
            >
              <span>{option.label}</span>
              <input
                type="radio"
                checked={colorMode === option.value}
                onChange={() => option.enabled && setColorMode(option.value)}
                disabled={!option.enabled}
              />
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Age and IDH color aggregation need per-hex metadata and are still pending.
        </p>
      </section>

      <div className="mt-4">
        <CompositionChart counts={composition} />
      </div>

      <section className="mt-4 rounded-2xl border border-[var(--border)] bg-white/3 p-4">
        <h3 className="mb-3 text-sm font-semibold">Patient Overview</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {patientStats.map((item) => (
            <div key={item.label} className="rounded-xl bg-black/15 px-3 py-2">
              <div className="text-[var(--text-muted)]">{item.label}</div>
              <div className="mt-1 font-medium">{item.value.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--border)] bg-white/3 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Senescence Distribution</h3>
          <span className="text-xs text-[var(--text-muted)]">cluster means</span>
        </div>
        <MiniHistogram values={histogramValues} color="#58a6ff" />
      </section>
    </aside>
  );
}
