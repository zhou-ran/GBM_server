import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/explorer', label: 'Explorer' },
  { to: '/about', label: 'About' },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] px-3 py-4">
      <div className="mb-6 px-3">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Navigation</div>
        <div className="mt-2 text-sm text-[var(--text-muted)]">
          Atlas overview, full-cell explorer, and project context.
        </div>
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
    </aside>
  );
}
