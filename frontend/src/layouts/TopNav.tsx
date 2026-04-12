import { Link, useLocation, useMatch } from 'react-router-dom';
import { useDataStore } from '../stores/dataStore';
import { useFilterStore } from '../stores/filterStore';
import { ThemeToggle } from '../components/common/ThemeToggle';

export function TopNav() {
  const { pathname } = useLocation();
  const cellMatch = useMatch('/explorer/cell/:cellId');
  const nCells = useDataStore((s) => s.nCells);
  const filterMask = useFilterStore((s) => s.filterMask);

  const filteredCount = filterMask ? filterMask.reduce((sum, value) => sum + value, 0) : nCells;
  const crumbs = [{ label: 'GBM Atlas', to: '/' }];

  if (pathname.startsWith('/explorer')) {
    crumbs.push({ label: 'Explorer', to: '/explorer' });
  }
  if (cellMatch?.params.cellId) {
    crumbs.push({ label: `Cell ${cellMatch.params.cellId}`, to: pathname });
  }
  if (pathname.startsWith('/about')) {
    crumbs.push({ label: 'About', to: '/about' });
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface-overlay)] px-4 backdrop-blur">
      <div className="flex items-center gap-6">
        <nav className="flex items-center gap-2 text-sm">
          {crumbs.map((crumb, index) => (
            <span key={crumb.to} className="flex items-center gap-2">
              {index > 0 && <span className="text-[var(--text-muted)]">/</span>}
              <Link
                to={crumb.to}
                className={index === crumbs.length - 1 ? 'font-medium text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}
              >
                {crumb.label}
              </Link>
            </span>
          ))}
        </nav>
        <div className="hidden items-center gap-4 text-xs text-[var(--text-muted)] md:flex">
          <span>{nCells.toLocaleString()} total cells</span>
          <span>{filteredCount.toLocaleString()} in current mask</span>
        </div>
      </div>
      <ThemeToggle />
    </header>
  );
}
