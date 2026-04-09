import { useMemo } from 'react';
import { useNavigationStore } from '../../stores/navigationStore';
import { useTrajectoryStore } from '../../stores/trajectoryStore';

export function TrajectorySidebar() {
  const selectedCellType = useNavigationStore((s) => s.selectedCellType);
  const cellchat = useTrajectoryStore((s) => s.cellchat);
  const mode = useTrajectoryStore((s) => s.mode);
  const setMode = useTrajectoryStore((s) => s.setMode);
  const selectedPathway = useTrajectoryStore((s) => s.selectedPathway);
  const setSelectedPathway = useTrajectoryStore((s) => s.setSelectedPathway);
  const isLoading = useTrajectoryStore((s) => s.isLoading);
  const error = useTrajectoryStore((s) => s.error);

  const pathways = useMemo(() => {
    const values = new Set((cellchat?.edges ?? []).map((edge) => edge.pathway));
    return ['All', ...Array.from(values).sort()];
  }, [cellchat]);

  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Level 4</div>
        <h2 className="mt-2 text-lg font-semibold">Trajectory & CellChat</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Context: {selectedCellType ?? 'select a Level 2 cell type first'}
        </p>
        {isLoading && <p className="mt-3 text-xs text-[var(--accent)]">Loading Level 4 data...</p>}
        {error && <p className="mt-3 text-xs text-[var(--text-muted)]">{error}</p>}
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
        <h3 className="mb-3 text-sm font-semibold">Mode</h3>
        {(['pseudotime', 'cellchat'] as const).map((option) => (
          <label key={option} className="mb-2 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--control-bg)] px-3 py-2 text-sm">
            <span>{option === 'pseudotime' ? 'Pseudotime' : 'CellChat'}</span>
            <input type="radio" checked={mode === option} onChange={() => setMode(option)} />
          </label>
        ))}
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
        <h3 className="mb-3 text-sm font-semibold">CellChat Pathway</h3>
        <select
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--control-bg)] px-3 py-2 text-sm text-[var(--text)]"
          value={selectedPathway}
          onChange={(event) => setSelectedPathway(event.target.value)}
        >
          {pathways.map((pathway) => <option key={pathway} value={pathway}>{pathway}</option>)}
        </select>
      </section>
    </aside>
  );
}
