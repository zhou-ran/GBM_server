import { useMemo } from 'react';
import { AGE_GROUP_COLORS, IDH_COLORS } from '../../lib/colors';
import { paletteCss } from '../../lib/colorScales';
import { useDataStore } from '../../stores/dataStore';
import { StackedBar } from '../common/StackedBar';
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

/* PLACEHOLDER_DONUT */

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
          <div className="flex h-full w-full items-center justify-center rounded-full" style={{ background: gradient }}>
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

export function DashboardGrid() {
  const globalStats = useDataStore((s) => s.globalStats);

  const ageEntries = useMemo<CountEntry[]>(() => {
    const ageStats = globalStats?.by_column.age_Group5565 ?? {};
    return Object.entries(ageStats).map(([label, value], i) => ({
      label, value, color: paletteCss(AGE_GROUP_COLORS[i] ?? [148, 163, 184, 220]),
    }));
  }, [globalStats]);

  const idhEntries = useMemo<CountEntry[]>(() => {
    const idhStats = globalStats?.by_column.IDH ?? {};
    return Object.entries(idhStats).map(([label, value], i) => ({
      label, value, color: paletteCss(IDH_COLORS[i] ?? [148, 163, 184, 220]),
    }));
  }, [globalStats]);

  const stageEntries = useMemo<CountEntry[]>(() => {
    const stageStats = globalStats?.by_column.stage ?? {};
    return Object.entries(stageStats)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label, value, color: i % 2 === 0 ? 'rgba(14,116,144,0.85)' : 'rgba(244,114,182,0.85)',
      }));
  }, [globalStats]);

  const sexEntries = useMemo<CountEntry[]>(() => {
    const sexStats = globalStats?.by_column.sex ?? {};
    return Object.entries(sexStats)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label, value, color: i === 0 ? 'rgba(251,146,60,0.9)' : 'rgba(96,165,250,0.9)',
      }));
  }, [globalStats]);

  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_top_left,rgba(9,105,218,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.08),transparent_28%),var(--bg)] px-4 py-4">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <div className="px-1">
          <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Atlas Overview</div>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text)]">Dashboard</h1>
        </div>

        <DashboardCard title="UMAP Atlas" subtitle="Interactive WebGL overview">
          <div className="h-full min-h-[480px] overflow-hidden rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface-overlay)]">
            <HexbinMap />
          </div>
        </DashboardCard>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DonutCard title="Age Distribution" subtitle="Patient cohorts" items={ageEntries} />
          <DonutCard title="IDH Split" subtitle="Tumor genotype mix" items={idhEntries} />

          <DashboardCard title="Stage Composition" subtitle="Clinical staging">
            <div className="flex h-full flex-col gap-4">
              <StackedBar items={stageEntries} />
              <div className="grid grid-cols-1 gap-2 overflow-auto pr-1">
                {stageEntries.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="flex-1 truncate">{item.label}</span>
                    <span className="text-xs text-[var(--text-muted)]">{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </DashboardCard>

          <DashboardCard title="Sex Composition" subtitle="Demographic split">
            <div className="flex h-full flex-col gap-4">
              <StackedBar items={sexEntries} />
              <div className="grid grid-cols-1 gap-2 overflow-auto pr-1">
                {sexEntries.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="flex-1 truncate">{item.label}</span>
                    <span className="text-xs text-[var(--text-muted)]">{item.value.toLocaleString()}</span>
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
