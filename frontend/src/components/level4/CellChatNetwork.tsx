import { categoricalCss } from '../../lib/colorScales';
import type { CellChatData } from '../../types/data';

interface CellChatNetworkProps {
  data: CellChatData | null;
  pathway: string;
}

export function CellChatNetwork({ data, pathway }: CellChatNetworkProps) {
  const nodes = data?.nodes ?? [];
  const edges = (data?.edges ?? [])
    .filter((edge) => pathway === 'All' || edge.pathway === pathway)
    .slice(0, 60);
  const width = 520;
  const height = 320;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.34;
  const positions = new Map(nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return [node.id, { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }];
  }));
  const maxScore = Math.max(...edges.map((edge) => edge.score), 1e-6);

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 text-center text-sm text-[var(--text-muted)]">
        No cell communication network available. Run CellChat preprocessing first.
      </div>
    );
  }

  return (
    <div className="h-full rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        {edges.map((edge) => {
          const source = positions.get(edge.source);
          const target = positions.get(edge.target);
          if (!source || !target) return null;
          return (
            <line
              key={`${edge.source}-${edge.target}-${edge.pair}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="var(--accent)"
              strokeOpacity={0.12 + (edge.score / maxScore) * 0.42}
              strokeWidth={1 + (edge.score / maxScore) * 5}
            />
          );
        })}
        {nodes.map((node, index) => {
          const point = positions.get(node.id)!;
          return (
            <g key={node.id}>
              <circle cx={point.x} cy={point.y} r="22" fill={categoricalCss(index)} />
              <text x={point.x} y={point.y + 4} textAnchor="middle" fill="#1f2328" fontSize="10" fontWeight="700">{node.label.slice(0, 5)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
