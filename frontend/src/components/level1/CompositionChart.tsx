import { useNavigate } from 'react-router-dom';
import { categoricalCss } from '../../lib/colorScales';
import { useNavigationStore } from '../../stores/navigationStore';
import { StackedBar } from '../common/StackedBar';

interface CompositionChartProps {
  counts: Record<string, number>;
}

export function CompositionChart({ counts }: CompositionChartProps) {
  const navigate = useNavigate();
  const setSelectedCellType = useNavigationStore((s) => s.setSelectedCellType);
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const items = entries.map(([label, value], index) => ({ label, value, color: categoricalCss(index) }));

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Cell Type Composition</h3>
        <span className="text-xs text-[var(--text-muted)]">{entries.length} classes</span>
      </div>
      <StackedBar
        items={items}
        onSelect={(item) => {
          setSelectedCellType(item.label);
          navigate('/explorer');
        }}
      />
      <div className="mt-4 space-y-2">
        {entries.map(([label, value], index) => (
          <button
            key={label}
            type="button"
            className="flex w-full items-center gap-3 text-left"
            onClick={() => {
              setSelectedCellType(label);
              navigate('/explorer');
            }}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: categoricalCss(index) }} />
            <span className="flex-1 text-sm">{label}</span>
            <span className="text-xs text-[var(--text-muted)]">
              {((value / Math.max(total, 1)) * 100).toFixed(1)}%
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
