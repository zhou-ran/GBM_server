export default function AboutPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-center px-8 py-12">
      <div className="max-w-3xl rounded-[2rem] border border-[var(--border)] bg-[var(--surface-raised)] p-8 shadow-sm">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">About</div>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--text)]">GBM Senescence Atlas</h1>
        <p className="mt-4 text-base leading-7 text-[var(--text-muted)]">
          This workspace combines atlas-scale UMAP exploration, phenotype-aware filtering, gene and signature
          overlays, and trajectory context for glioblastoma senescence analysis.
        </p>
        <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
          The current UI is organized around shareable routes so overview, explorer state, and direct cell links can
          be opened with browser navigation intact.
        </p>
      </div>
    </div>
  );
}
