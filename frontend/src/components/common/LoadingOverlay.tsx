import { useUIStore } from '../../stores/uiStore';

export function LoadingOverlay() {
  const isLoading = useUIStore((s) => s.isLoading);
  const loadingMessage = useUIStore((s) => s.loadingMessage);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <div className="min-w-64 rounded-2xl border border-white/10 bg-[#101722]/90 px-6 py-5 shadow-2xl">
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--accent)]" />
        </div>
        <div className="text-sm font-medium text-[var(--text)]">{loadingMessage || 'Loading...'}</div>
      </div>
    </div>
  );
}
