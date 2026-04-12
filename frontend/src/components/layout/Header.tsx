/** Header — stats bar showing cell counts and render mode */

import { useLocation } from 'react-router-dom';
import { useDataStore } from '../../stores/dataStore';
import { useFilterStore } from '../../stores/filterStore';
import { ThemeToggle } from '../common/ThemeToggle';

export function Header() {
  const nCells = useDataStore((s) => s.nCells);
  const filterMask = useFilterStore((s) => s.filterMask);
  const { pathname } = useLocation();

  const filteredCount = filterMask
    ? filterMask.reduce((sum, v) => sum + v, 0)
    : nCells;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 text-sm">
      <span className="font-semibold text-[var(--accent)]">GBM Senescence Atlas</span>
      <div className="flex items-center gap-4 text-[var(--text-muted)]">
        <div className="flex gap-6">
          <span>Total: {nCells.toLocaleString()}</span>
          <span>Filtered: {filteredCount.toLocaleString()}</span>
          <span>Route: {pathname}</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
