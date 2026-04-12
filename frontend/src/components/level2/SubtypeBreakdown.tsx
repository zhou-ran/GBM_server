import { useNavigate } from 'react-router-dom';
import { useNavigationStore } from '../../stores/navigationStore';
import { categoricalCss } from '../../lib/colorScales';

interface SubtypeBreakdownProps {
  counts: Record<string, number>;
}

export function SubtypeBreakdown({ counts }: SubtypeBreakdownProps) {
  const navigate = useNavigate();
  const setSelectedSubCluster = useNavigationStore((s) => s.setSelectedSubCluster);
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  return (
    <div className="space-y-2">
      {entries.map(([label, value], index) => {
        const ratio = total > 0 ? (value / total) * 100 : 0;
        return (
          <button
            key={label}
            type="button"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--control-bg)] px-3 py-2 text-left hover:border-[var(--accent)]"
            onClick={() => {
              setSelectedSubCluster(label);
              navigate('/explorer');
            }}
          >
            <div className="flex items-center justify-between text-sm">
              <span>{label}</span>
              <span className="text-[var(--text-muted)]">{ratio.toFixed(1)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--control-bg)]">
              <div className="h-full rounded-full" style={{ width: `${ratio}%`, background: categoricalCss(index) }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
