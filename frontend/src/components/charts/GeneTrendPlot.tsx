import { pseudotimeCss } from '../../lib/colorScales';
import type { TrajectoryGenes } from '../../types/data';

interface GeneTrendPlotProps {
  trends: TrajectoryGenes | null;
}

export function GeneTrendPlot({ trends }: GeneTrendPlotProps) {
  const genes = trends?.genes.slice(0, 6) ?? [];
  const bins = trends?.bins ?? [];

  if (genes.length === 0 || bins.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 text-center text-sm text-[var(--text-muted)]">
        No gene trends available yet.
      </div>
    );
  }

  const allValues = genes.flatMap((gene) => gene.mean_expression).filter((value): value is number => value !== null);
  const max = Math.max(...allValues, 1e-6);
  const width = 640;
  const height = 260;
  const pad = 36;

  return (
    <div className="h-full rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        <line x1={pad} y1={height - pad} x2={width - 12} y2={height - pad} stroke="var(--border)" />
        <line x1={pad} y1={12} x2={pad} y2={height - pad} stroke="var(--border)" />
        {genes.map((gene, geneIndex) => {
          const points = gene.mean_expression
            .map((value, index) => {
              if (value === null) return null;
              const x = pad + (index / Math.max(bins.length - 1, 1)) * (width - pad - 20);
              const y = height - pad - (value / max) * (height - pad - 20);
              return `${x},${y}`;
            })
            .filter(Boolean)
            .join(' ');
          return (
            <g key={gene.gene}>
              <polyline fill="none" stroke={pseudotimeCss(geneIndex / Math.max(genes.length - 1, 1))} strokeWidth="3" points={points} />
              <text x={width - 110} y={22 + geneIndex * 17} fill="var(--text-muted)" fontSize="12">{gene.gene}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
