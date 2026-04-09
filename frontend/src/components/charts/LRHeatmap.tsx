import type { CellChatData } from '../../types/data';

interface LRHeatmapProps {
  data: CellChatData | null;
  pathway: string;
}

export function LRHeatmap({ data, pathway }: LRHeatmapProps) {
  const pairs = (data?.pairs ?? [])
    .filter((pair) => pathway === 'All' || pair.pathway === pathway)
    .slice(0, 12);
  const columns = data?.nodes.map((node) => node.id) ?? [];
  const maxScore = Math.max(...pairs.flatMap((pair) => pair.scores.map((score) => score.score)), 1e-6);

  return (
    <div className="h-full overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-xs">
      {pairs.length === 0 ? (
        <div className="flex h-full items-center justify-center text-center text-sm text-[var(--text-muted)]">No ligand-receptor heatmap available.</div>
      ) : (
        <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${columns.length}, minmax(36px, 1fr))` }}>
          <div />
          {columns.map((column) => <div key={column} className="truncate text-[var(--text-muted)]" title={column}>{column}</div>)}
          {pairs.map((pair) => [
            <div key={`${pair.pair}-label`} className="truncate font-medium" title={pair.pair}>{pair.pair}</div>,
            ...columns.map((target) => {
              const score = pair.scores
                .filter((item) => item.target === target)
                .reduce((sum, item) => sum + item.score, 0);
              const alpha = Math.min(1, score / maxScore);
              return (
                <div
                  key={`${pair.pair}-${target}`}
                  className="h-6 rounded"
                  title={`${pair.pair} → ${target}: ${score.toExponential(2)}`}
                  style={{ background: `rgb(9 105 218 / ${0.08 + alpha * 0.82})` }}
                />
              );
            }),
          ])}
        </div>
      )}
    </div>
  );
}
