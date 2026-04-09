import { useUIStore } from '../../stores/uiStore';

export function LoadingOverlay() {
  const isLoading = useUIStore((s) => s.isLoading);
  const loadingMessage = useUIStore((s) => s.loadingMessage);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(31_35_40_/_0.32)] backdrop-blur-sm dark:bg-black/55">
      <div className="min-w-64 rounded-2xl border border-[var(--border)] bg-[var(--surface-overlay)] px-6 py-5 shadow-2xl">
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[var(--control-bg)]">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--accent)]" />
        </div>
        <div className="text-sm font-medium text-[var(--text)]">{loadingMessage || 'Loading...'}</div>
      </div>
    </div>
  );
}
