import type { ReactNode } from 'react';

interface TooltipProps {
  x: number;
  y: number;
  children: ReactNode;
}

export function Tooltip({ x, y, children }: TooltipProps) {
  return (
    <div
      className="pointer-events-none absolute z-20 min-w-44 rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] px-3 py-2 text-xs text-[var(--text)] shadow-xl"
      style={{ left: x + 12, top: y + 12 }}
    >
      {children}
    </div>
  );
}
