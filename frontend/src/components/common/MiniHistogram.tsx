interface MiniHistogramProps {
  values: number[];
  color?: string;
}

export function MiniHistogram({ values, color = 'var(--accent)' }: MiniHistogramProps) {
  const max = Math.max(...values, 1);

  return (
    <div className="flex h-16 items-end gap-1 rounded-xl border border-[var(--border)] bg-black/15 px-2 py-2">
      {values.map((value, index) => (
        <div
          key={`${index}-${value}`}
          className="flex-1 rounded-t-sm"
          style={{
            height: `${(value / max) * 100}%`,
            background: color,
            opacity: 0.35 + (value / max) * 0.65,
          }}
        />
      ))}
    </div>
  );
}
