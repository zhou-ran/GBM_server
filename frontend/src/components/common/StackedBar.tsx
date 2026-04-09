interface StackedBarItem {
  label: string;
  value: number;
  color: string;
}

interface StackedBarProps {
  items: StackedBarItem[];
  onSelect?: (item: StackedBarItem) => void;
}

export function StackedBar({ items, onSelect }: StackedBarProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex h-4 overflow-hidden rounded-full bg-[var(--control-bg)]">
      {items.map((item) => {
        const width = total > 0 ? `${(item.value / total) * 100}%` : '0%';
        return (
          <button
            key={item.label}
            type="button"
            className="h-full transition-opacity hover:opacity-85"
            style={{ width, background: item.color }}
            onClick={() => onSelect?.(item)}
            title={`${item.label}: ${item.value.toLocaleString()}`}
          />
        );
      })}
    </div>
  );
}
