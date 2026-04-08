/** Header — stats bar showing cell counts and render mode */

import { useDataStore } from '../../stores/dataStore';
import { useFilterStore } from '../../stores/filterStore';
import { useNavigationStore } from '../../stores/navigationStore';

export function Header() {
  const nCells = useDataStore((s) => s.nCells);
  const filterMask = useFilterStore((s) => s.filterMask);
  const currentLevel = useNavigationStore((s) => s.currentLevel);

  const filteredCount = filterMask
    ? filterMask.reduce((sum, v) => sum + v, 0)
    : nCells;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 text-sm">
      <span className="font-semibold text-[var(--accent)]">GBM Senescence Atlas</span>
      <div className="flex gap-6 text-[var(--text-muted)]">
        <span>Total: {nCells.toLocaleString()}</span>
        <span>Filtered: {filteredCount.toLocaleString()}</span>
        <span>Level: {currentLevel}</span>
      </div>
    </header>
  );
}
