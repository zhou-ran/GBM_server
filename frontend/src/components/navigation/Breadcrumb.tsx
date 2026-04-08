import { useNavigationStore } from '../../stores/navigationStore';

export function Breadcrumb() {
  const history = useNavigationStore((s) => s.history);
  const currentLevel = useNavigationStore((s) => s.currentLevel);
  const navigateBack = useNavigationStore((s) => s.navigateBack);

  return (
    <nav className="flex items-center gap-2 border-b border-[var(--border)] bg-[#111926] px-4 py-2 text-sm">
      {history.map((entry, index) => {
        const active = entry.level === currentLevel;
        return (
          <div key={`${entry.level}-${entry.label}`} className="flex items-center gap-2">
            <button
              type="button"
              className={active ? 'font-medium text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}
              onClick={() => navigateBack(entry.level)}
            >
              {entry.label}
            </button>
            {index < history.length - 1 && <span className="text-[var(--text-muted)]">/</span>}
          </div>
        );
      })}
    </nav>
  );
}
