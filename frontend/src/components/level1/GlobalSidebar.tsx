import { useMemo, useState } from 'react';
import { useDataStore } from '../../stores/dataStore';
import { useColorStore } from '../../stores/colorStore';
import { GeneAutocomplete } from '../level3/GeneAutocomplete';
import { MiniHistogram } from '../common/MiniHistogram';
import { CompositionChart } from './CompositionChart';

const LEVEL1_OPTIONS = [
  { value: 'celltype', label: 'Cell Type' },
  { value: 'celltype2', label: 'Cell Type Level 2' },
  { value: 'age', label: 'Age Group' },
  { value: 'idh', label: 'IDH Status' },
  { value: 'senescence', label: 'Senescence' },
  { value: 'gene', label: 'Gene Expression' },
] as const;

export function GlobalSidebar() {
  const globalStats = useDataStore((s) => s.globalStats);
  const centroids = useDataStore((s) => s.centroids);
  const colorMode = useColorStore((s) => s.colorMode);
  const setColorMode = useColorStore((s) => s.setColorMode);
  const loadGene = useColorStore((s) => s.loadGene);
  const geneName = useColorStore((s) => s.geneName);
  const isLoadingGene = useColorStore((s) => s.isLoadingGene);
  const [geneQuery, setGeneQuery] = useState(geneName ?? '');

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

  const showGeneControl = colorMode === 'gene' || !!geneName;

  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
        <h3 className="mb-3 text-sm font-semibold">Color By</h3>
        <select
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--control-bg)] px-3 py-2 text-sm text-[var(--text)]"
          value={LEVEL1_OPTIONS.some((option) => option.value === colorMode) ? colorMode : 'celltype'}
          onChange={(event) => setColorMode(event.target.value as typeof LEVEL1_OPTIONS[number]['value'])}
        >
          {LEVEL1_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {showGeneControl && (
          <div className="mt-3">
            <GeneAutocomplete
              value={geneQuery}
              onChange={setGeneQuery}
              onSelect={(gene) => {
                setColorMode('gene');
                void loadGene(gene);
              }}
            />
            <button
              type="button"
              className="mt-3 w-full rounded-xl bg-[var(--accent)] px-3 py-2 text-sm text-white disabled:opacity-50"
              onClick={() => {
                const gene = geneQuery.trim();
                if (!gene) return;
                setColorMode('gene');
                void loadGene(gene);
              }}
              disabled={isLoadingGene || !geneQuery.trim()}
            >
              {isLoadingGene ? 'Loading gene...' : 'Apply Gene'}
            </button>
            <div className="mt-2 text-xs text-[var(--text-muted)]">
              Type at least two letters to get autocomplete suggestions.
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-[var(--text-muted)]">
          The homepage now supports cell type, subtype, age, IDH, senescence, and direct gene-expression coloring.
        </p>
      </section>

      <div className="mt-4">
        <CompositionChart counts={composition} />
      </div>

      <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
        <h3 className="mb-3 text-sm font-semibold">Patient Overview</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {patientStats.map((item) => (
            <div key={item.label} className="rounded-xl bg-[var(--control-bg)] px-3 py-2">
              <div className="text-[var(--text-muted)]">{item.label}</div>
              <div className="mt-1 font-medium">{item.value.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Senescence Distribution</h3>
          <span className="text-xs text-[var(--text-muted)]">cluster means</span>
        </div>
        <MiniHistogram values={histogramValues} color="#58a6ff" />
      </section>
    </aside>
  );
}
