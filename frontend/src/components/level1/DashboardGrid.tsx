import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AGE_GROUP_COLORS, IDH_COLORS } from '../../lib/colors';
import { categoricalCss, paletteCss } from '../../lib/colorScales';
import { useDataStore } from '../../stores/dataStore';
import { useColorStore } from '../../stores/colorStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { Legend } from '../color/Legend';
import { MiniHistogram } from '../common/MiniHistogram';
import { StackedBar } from '../common/StackedBar';
import { GeneAutocomplete } from '../level3/GeneAutocomplete';
import { HexbinMap } from './HexbinMap';

type CountEntry = {
  label: string;
  value: number;
  color: string;
};

function DashboardCard({
  title,
  subtitle,
  className = '',
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] shadow-[0_18px_50px_rgba(15,23,42,0.06)] ${className}`}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Dashboard</div>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
            {subtitle && <span className="text-xs text-[var(--text-muted)]">{subtitle}</span>}
          </div>
        </div>
        <div className="min-h-0 flex-1 p-4">{children}</div>
      </div>
    </section>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-overlay)] p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className="text-2xl font-semibold text-[var(--text)]">{value}</div>
        <div className="h-2 w-2 rounded-full" style={{ background: accent }} />
      </div>
    </div>
  );
}

function DonutCard({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: CountEntry[];
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const gradient = useMemo(() => {
    if (total === 0 || items.length === 0) {
      return 'conic-gradient(from -90deg, rgba(148,163,184,0.4) 0deg 360deg)';
    }

    let current = 0;
    const stops = items.map((item) => {
      const start = (current / total) * 360;
      current += item.value;
      const end = (current / total) * 360;
      return `${item.color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(from -90deg, ${stops.join(', ')})`;
  }, [items, total]);

  return (
    <DashboardCard title={title} subtitle={subtitle}>
      <div className="flex h-full flex-col gap-4">
        <div className="mx-auto flex aspect-square w-full max-w-[9.5rem] items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-overlay)] p-3">
          <div
            className="flex h-full w-full items-center justify-center rounded-full"
            style={{ background: gradient }}
          >
            <div className="flex h-[62%] w-[62%] flex-col items-center justify-center rounded-full bg-[var(--surface-raised)] text-center">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Total</div>
              <div className="mt-1 text-xl font-semibold text-[var(--text)]">{total.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="space-y-2 overflow-auto pr-1 text-sm">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
              <span className="flex-1 truncate text-[var(--text)]">{item.label}</span>
              <span className="text-xs text-[var(--text-muted)]">
                {total > 0 ? `${((item.value / total) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}

function CompactColorCard() {
  const colorMode = useColorStore((s) => s.colorMode);
  const setColorMode = useColorStore((s) => s.setColorMode);
  const loadGene = useColorStore((s) => s.loadGene);
  const geneName = useColorStore((s) => s.geneName);
  const isLoadingGene = useColorStore((s) => s.isLoadingGene);
  const [geneQuery, setGeneQuery] = useState(geneName ?? '');

  return (
    <DashboardCard title="View Encoding" subtitle="Color and feature controls">
      <div className="flex h-full flex-col gap-3">
        <select
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--control-bg)] px-3 py-2 text-sm text-[var(--text)]"
          value={['celltype', 'celltype2', 'age', 'idh', 'senescence', 'gene'].includes(colorMode) ? colorMode : 'celltype'}
          onChange={(event) => setColorMode(event.target.value as 'celltype' | 'celltype2' | 'age' | 'idh' | 'senescence' | 'gene')}
        >
          <option value="celltype">Cell Type</option>
          <option value="celltype2">Cell Type Level 2</option>
          <option value="age">Age Group</option>
          <option value="idh">IDH Status</option>
          <option value="senescence">Senescence</option>
          <option value="gene">Gene Expression</option>
        </select>

        {(colorMode === 'gene' || !!geneName) && (
          <div className="space-y-2">
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
              className="w-full rounded-xl bg-[var(--accent)] px-3 py-2 text-sm text-white disabled:opacity-50"
              disabled={isLoadingGene || !geneQuery.trim()}
              onClick={() => {
                const gene = geneQuery.trim();
                if (!gene) return;
                setColorMode('gene');
                void loadGene(gene);
              }}
            >
              {isLoadingGene ? 'Loading gene...' : 'Apply gene'}
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-overlay)] p-3">
          <Legend />
        </div>
      </div>
    </DashboardCard>
  );
}

export function DashboardGrid() {
  const navigate = useNavigate();
  const setSelectedCellType = useNavigationStore((s) => s.setSelectedCellType);
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

  const cellTypeEntries = useMemo<CountEntry[]>(() => {
    const composition = globalStats?.by_column.CellType ?? {};
    return Object.entries(composition)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], index) => ({
        label,
        value,
        color: categoricalCss(index),
      }));
  }, [globalStats]);

  const ageEntries = useMemo<CountEntry[]>(() => {
    const ageStats = globalStats?.by_column.age_Group5565 ?? {};
    return Object.entries(ageStats).map(([label, value], index) => ({
      label,
      value,
      color: paletteCss(AGE_GROUP_COLORS[index] ?? [148, 163, 184, 220]),
    }));
  }, [globalStats]);

  const idhEntries = useMemo<CountEntry[]>(() => {
    const idhStats = globalStats?.by_column.IDH ?? {};
    return Object.entries(idhStats).map(([label, value], index) => ({
      label,
      value,
      color: paletteCss(IDH_COLORS[index] ?? [148, 163, 184, 220]),
    }));
  }, [globalStats]);

  const stageEntries = useMemo<CountEntry[]>(() => {
    const stageStats = globalStats?.by_column.stage ?? {};
    return Object.entries(stageStats)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], index) => ({
        label,
        value,
        color: index % 2 === 0 ? 'rgba(14,116,144,0.85)' : 'rgba(244,114,182,0.85)',
      }));
  }, [globalStats]);

  const sexEntries = useMemo<CountEntry[]>(() => {
    const sexStats = globalStats?.by_column.sex ?? {};
    return Object.entries(sexStats)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], index) => ({
        label,
        value,
        color: index === 0 ? 'rgba(251,146,60,0.9)' : 'rgba(96,165,250,0.9)',
      }));
  }, [globalStats]);

  const senescenceHistogram = useMemo(() => {
    if (centroids.length === 0) return [0, 0, 0, 0, 0, 0];
    return centroids
      .map((centroid) => centroid.senescence_mean)
      .sort((a, b) => a - b)
      .reduce<number[]>((bins, value) => {
        const index = Math.min(bins.length - 1, Math.floor(value * bins.length));
        bins[index] += 1;
        return bins;
      }, [0, 0, 0, 0, 0, 0]);
  }, [centroids]);

  const topCellTypes = cellTypeEntries.slice(0, 6);

  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_top_left,rgba(9,105,218,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.08),transparent_28%),var(--bg)] px-4 py-4">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <div className="px-1">
          <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Atlas Overview</div>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--text)]">Dashboard Matrix</h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Fixed-card overview for atlas navigation, cohort composition, and annotation-level distribution.
              </p>
            </div>
            <div className="hidden rounded-full border border-[var(--border)] bg-[var(--surface-overlay)] px-4 py-2 text-sm text-[var(--text-muted)] xl:block">
              4-column board • dense summary • click any annotation to drill into Explorer
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:auto-rows-[220px] md:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            title="UMAP Atlas"
            subtitle="Interactive WebGL overview"
            className="md:col-span-2 md:row-span-2"
          >
            <div className="h-full min-h-[420px] overflow-hidden rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface-overlay)]">
              <HexbinMap />
            </div>
          </DashboardCard>

          <DashboardCard title="Atlas Snapshot" subtitle="Core cohort metrics">
            <div className="grid h-full grid-cols-2 gap-3">
              <StatTile label="Cells" value={nCells.toLocaleString()} accent="var(--accent)" />
              <StatTile label="Donors" value={donorCount.toLocaleString()} accent="rgba(16,185,129,0.9)" />
              <StatTile label="Cell Types" value={String(cellTypeEntries.length)} accent="rgba(244,114,182,0.9)" />
              <StatTile label="Mean Senescence" value={meanSenescence.toFixed(3)} accent="rgba(245,158,11,0.9)" />
            </div>
          </DashboardCard>

          <CompactColorCard />

          <DashboardCard title="Cell Annotation Distribution" subtitle={`${cellTypeEntries.length} annotation groups`}>
            <div className="flex h-full flex-col gap-4">
              <StackedBar
                items={cellTypeEntries}
                onSelect={(item) => {
                  setSelectedCellType(item.label);
                  navigate('/explorer');
                }}
              />
              <div className="space-y-2 overflow-auto pr-1">
                {topCellTypes.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-[var(--control-bg)]"
                    onClick={() => {
                      setSelectedCellType(item.label);
                      navigate('/explorer');
                    }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="flex-1 truncate text-sm text-[var(--text)]">{item.label}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {((item.value / Math.max(nCells, 1)) * 100).toFixed(1)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </DashboardCard>

          <DonutCard title="Age Distribution" subtitle="Patient cohorts" items={ageEntries} />

          <DonutCard title="IDH Split" subtitle="Tumor genotype mix" items={idhEntries} />

          <DashboardCard title="Stage and Sex" subtitle="Clinical composition">
            <div className="grid h-full grid-cols-1 gap-4">
              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Stage</div>
                <StackedBar items={stageEntries} />
                <div className="mt-3 space-y-2">
                  {stageEntries.slice(0, 4).map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="flex-1 truncate">{item.label}</span>
                      <span className="text-xs text-[var(--text-muted)]">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Sex</div>
                <StackedBar items={sexEntries} />
                <div className="mt-3 space-y-2">
                  {sexEntries.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="flex-1 truncate">{item.label}</span>
                      <span className="text-xs text-[var(--text-muted)]">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard title="Senescence Spread" subtitle="Cluster-level mean distribution">
            <div className="flex h-full flex-col justify-between gap-4">
              <MiniHistogram values={senescenceHistogram} color="linear-gradient(180deg, #f97316, #0ea5e9)" />
              <div className="grid grid-cols-3 gap-3 text-center">
                {senescenceHistogram.map((value, index) => (
                  <div key={`${index}-${value}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-overlay)] px-2 py-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Bin {index + 1}</div>
                    <div className="mt-2 text-lg font-semibold">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
