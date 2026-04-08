import { useEffect, useMemo, useState } from 'react';
import { FilterPanel } from '../filters/FilterPanel';
import { SubtypeBreakdown } from './SubtypeBreakdown';
import { useClusterStats } from '../../hooks/useClusterStats';
import { useFilterStore } from '../../stores/filterStore';
import { useNavigationStore } from '../../stores/navigationStore';

export function ClusterSidebar() {
  const selectedCellType = useNavigationStore((s) => s.selectedCellType);
  const setCellTypeFilter = useFilterStore((s) => s.setCellTypeFilter);
  const highlightDonor = useFilterStore((s) => s.highlightDonor);
  const { filteredPatients, subtypeCounts } = useClusterStats();
  const [query, setQuery] = useState('');

  useEffect(() => {
    setCellTypeFilter(selectedCellType);
  }, [selectedCellType, setCellTypeFilter]);

  const donorMatches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return filteredPatients.slice(0, 8);
    return filteredPatients
      .filter((patient) => patient.donor_id.toLowerCase().includes(normalized))
      .slice(0, 8);
  }, [filteredPatients, query]);

  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[#0f1722] px-4 py-4">
      <section className="rounded-2xl border border-[var(--border)] bg-white/3 p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Level 2</div>
        <h2 className="mt-2 text-lg font-semibold">{selectedCellType ?? 'Cell Type'}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Clinical filters stay active while the major cell type filter is locked to this drill-down.
        </p>
      </section>

      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/3 p-4">
        <FilterPanel omitColumns={['CellType']} />
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/3 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Sub-types</h3>
          <span className="text-xs text-[var(--text-muted)]">{Object.keys(subtypeCounts).length} groups</span>
        </div>
        <SubtypeBreakdown counts={subtypeCounts} />
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/3 p-4">
        <h3 className="text-sm font-semibold">Donor Highlight</h3>
        <input
          className="mt-3 w-full rounded-xl border border-[var(--border)] bg-black/15 px-3 py-2 text-sm"
          placeholder="Search donor"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="mt-3 space-y-2">
          {donorMatches.map((patient) => (
            <button
              key={patient.donor_id}
              type="button"
              className="flex w-full items-center justify-between rounded-xl bg-black/10 px-3 py-2 text-left text-sm"
              onClick={() => highlightDonor(patient.donorIndex)}
            >
              <span>{patient.donor_id}</span>
              <span className="text-[var(--text-muted)]">{patient.n_cells.toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
