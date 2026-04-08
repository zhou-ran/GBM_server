/** FilterChip — toggle chip for a single category */

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
        active
          ? 'bg-[var(--accent)] bg-opacity-20 border-[var(--accent)] text-[var(--text)]'
          : 'bg-transparent border-[var(--border)] text-[var(--text-muted)]'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
