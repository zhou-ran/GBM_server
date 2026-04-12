import { useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { categoricalCss } from '../lib/colorScales';
import { useDataStore } from '../stores/dataStore';
import { useColorStore } from '../stores/colorStore';
import { useNavigationStore } from '../stores/navigationStore';
import { Legend } from '../components/color/Legend';
import { StackedBar } from '../components/common/StackedBar';
import { GeneAutocomplete } from '../components/level3/GeneAutocomplete';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/explorer', label: 'Explorer' },
  { to: '/about', label: 'About' },
  { to: '/help', label: 'Help' },
];

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-3">
      <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{title}</div>
      {children}
    </div>
  );
}

function AtlasSnapshot() {
  const nCells = useDataStore((s) => s.nCells);
  const schema = useDataStore((s) => s.schema);
  const globalStats = useDataStore((s) => s.globalStats);

  const donorCount = schema?.columns.find((c) => c.name === 'donor_id')?.categories.length ?? 0;
  const cellTypeCount = Object.keys(globalStats?.by_column.CellType ?? {}).length;

  const stats = [
    { label: 'Cells', value: nCells.toLocaleString(), accent: 'var(--accent)' },
    { label: 'Donors', value: donorCount.toLocaleString(), accent: 'rgba(16,185,129,0.9)' },
    { label: 'Cell Types', value: String(cellTypeCount), accent: 'rgba(244,114,182,0.9)' },
  ];

  return (
    <SidebarSection title="Atlas Snapshot">
      <div className="space-y-1.5">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] px-3 py-2">
            <span className="text-xs text-[var(--text-muted)]">{s.label}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-[var(--text)]">{s.value}</span>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.accent }} />
            </div>
          </div>
        ))}
      </div>
    </SidebarSection>
  );
}

/* PLACEHOLDER_VIEW_ENCODING */

function ViewEncoding() {
  const colorMode = useColorStore((s) => s.colorMode);
  const setColorMode = useColorStore((s) => s.setColorMode);
  const loadGene = useColorStore((s) => s.loadGene);
  const geneName = useColorStore((s) => s.geneName);
  const isLoadingGene = useColorStore((s) => s.isLoadingGene);
  const [geneQuery, setGeneQuery] = useState(geneName ?? '');

  return (
    <SidebarSection title="View Encoding">
      <div className="space-y-2">
        <select
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--control-bg)] px-2.5 py-1.5 text-xs text-[var(--text)]"
          value={['celltype', 'celltype2', 'age', 'idh', 'senescence', 'gene'].includes(colorMode) ? colorMode : 'celltype'}
          onChange={(e) => setColorMode(e.target.value as 'celltype' | 'celltype2' | 'age' | 'idh' | 'senescence' | 'gene')}
        >
          <option value="celltype">Cell Type</option>
          <option value="celltype2">Cell Type Level 2</option>
          <option value="age">Age Group</option>
          <option value="idh">IDH Status</option>
          <option value="senescence">Senescence</option>
          <option value="gene">Gene Expression</option>
        </select>

        {(colorMode === 'gene' || !!geneName) && (
          <div className="space-y-1.5">
            <GeneAutocomplete value={geneQuery} onChange={setGeneQuery} onSelect={(gene) => { setColorMode('gene'); void loadGene(gene); }} />
            <button
              type="button"
              className="w-full rounded-xl bg-[var(--accent)] px-2.5 py-1.5 text-xs text-white disabled:opacity-50"
              disabled={isLoadingGene || !geneQuery.trim()}
              onClick={() => { const gene = geneQuery.trim(); if (!gene) return; setColorMode('gene'); void loadGene(gene); }}
            >
              {isLoadingGene ? 'Loading...' : 'Apply gene'}
            </button>
          </div>
        )}

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] p-2">
          <Legend />
        </div>
      </div>
    </SidebarSection>
  );
}

/* PLACEHOLDER_ANNOTATION */

function CellAnnotationDist() {
  const navigate = useNavigate();
  const nCells = useDataStore((s) => s.nCells);
  const globalStats = useDataStore((s) => s.globalStats);
  const setSelectedCellType = useNavigationStore((s) => s.setSelectedCellType);

  const entries = useMemo(() => {
    const composition = globalStats?.by_column.CellType ?? {};
    return Object.entries(composition)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: categoricalCss(i) }));
  }, [globalStats]);

  const top6 = entries.slice(0, 6);

  return (
    <SidebarSection title="Cell Annotation">
      <div className="space-y-2">
        <StackedBar
          items={entries}
          onSelect={(item) => { setSelectedCellType(item.label); navigate('/explorer'); }}
        />
        <div className="space-y-0.5">
          {top6.map((item) => (
            <button
              key={item.label}
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-[var(--control-bg)]"
              onClick={() => { setSelectedCellType(item.label); navigate('/explorer'); }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
              <span className="flex-1 truncate text-xs text-[var(--text)]">{item.label}</span>
              <span className="text-[10px] text-[var(--text-muted)]">
                {((item.value / Math.max(nCells, 1)) * 100).toFixed(1)}%
              </span>
            </button>
          ))}
        </div>
      </div>
    </SidebarSection>
  );
}

export function Sidebar() {
  const { pathname } = useLocation();
  const isDashboard = pathname === '/';

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] px-3 py-4">
      <div className="px-3">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Navigation</div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `rounded-2xl px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-muted)] hover:bg-[var(--control-bg)] hover:text-[var(--text)]'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {isDashboard && (
        <>
          <div className="border-t border-[var(--border)]" />
          <AtlasSnapshot />
          <ViewEncoding />
          <CellAnnotationDist />
        </>
      )}
    </aside>
  );
}
