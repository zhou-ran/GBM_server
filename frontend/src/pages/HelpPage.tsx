const sections = [
  {
    title: 'Getting Started',
    content:
      'The GBM Senescence Atlas is an interactive workspace for exploring 2.26 million single cells from a glioblastoma aging and senescence study. ' +
      'Use the sidebar to navigate between the Dashboard overview, the full-cell Explorer, and this Help page.',
  },
  {
    title: 'Dashboard',
    items: [
      'Hexbin Map — aggregated UMAP overview colored by average senescence score.',
      'Summary Stats — total cell count, donor count, and sample count at a glance.',
      'Composition Chart — stacked bar chart showing cell-type proportions across clinical groups.',
      'Click any cell-type cluster on the hexbin map to jump into the Explorer with that cluster pre-selected.',
    ],
  },
  {
    title: 'Explorer',
    items: [
      'Renders all 2.26M cells on a WebGL-accelerated UMAP canvas powered by deck.gl.',
      'Density mode (> 5 000 visible cells) — GPU-aggregated heatmap weighted by senescence or gene expression.',
      'Detail mode (≤ 5 000 visible cells) — individual scatter points colored by the active color mode.',
      'Pan, zoom, and click individual cells to open the Cell Profiler drawer with per-cell metadata.',
    ],
  },
  {
    title: 'Filters',
    items: [
      'Filter chips appear in the left panel for CellType, CellType Level 2, IDH status, Stage, Age Group, and Sex.',
      'Click a chip to toggle that category on or off. The UMAP updates in real time.',
      'Active filters are combined with AND logic — only cells matching all selected categories are shown.',
      'The header bar shows the filtered cell count so you always know how many cells remain.',
    ],
  },
  {
    title: 'Color Modes',
    items: [
      'CellType — discrete palette for 9 major cell types.',
      'CellType Level 2 — finer 17-category subtype palette.',
      'Senescence — continuous blue-to-red gradient mapped to the normalized senescence score.',
      'Gene Expression — search for any gene to overlay its normalized expression as a continuous color scale.',
    ],
  },
  {
    title: 'Gene Search',
    items: [
      'Open the color-mode dropdown and select "Gene Expression".',
      'Type a gene symbol (e.g. TP53, CDKN2A) into the search box — results autocomplete from 57 000+ genes.',
      'The expression vector is fetched as an Arrow IPC stream and rendered as a continuous overlay on the UMAP.',
      'Signature Presets let you score cells against curated gene sets (CellAge, SenMayo markers).',
    ],
  },
  {
    title: 'Analysis Panel',
    items: [
      'Waterfall Chart — differential expression results ranked by log-fold change for the selected cell type.',
      'Correlation Scatter — senescence score vs. selected gene expression with per-cell-type regression.',
      'Dot Plot — mean expression and percent-expressed matrix across cell types.',
      'Violin Plot — distribution of expression or senescence across clinical groups.',
    ],
  },
  {
    title: 'Trajectory & Communication',
    items: [
      'Pseudotime trajectories are available for major cell types — select one to see developmental ordering.',
      'Gene trend plots show how marker genes change along pseudotime.',
      'CellChat network visualizes ligand-receptor communication between cell types.',
    ],
  },
  {
    title: 'Tips',
    items: [
      'Use the theme toggle (top-right) to switch between light and dark mode.',
      'Bookmark any URL — routes are shareable and support browser back / forward.',
      'The atlas loads ~49 MB of cell data on first visit; subsequent visits use browser cache.',
      'Hover over cells in Detail mode to see a tooltip with cell type and metadata.',
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-y-auto px-8 py-12">
      <div className="max-w-3xl space-y-6">
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface-raised)] p-8 shadow-sm">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Documentation</div>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--text)]">Help</h1>
          <p className="mt-4 text-base leading-7 text-[var(--text-muted)]">
            A quick reference for navigating and using the GBM Senescence Atlas.
          </p>
        </div>

        {sections.map((section) => (
          <div
            key={section.title}
            className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface-raised)] p-8 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-[var(--text)]">{section.title}</h2>
            {'content' in section && (
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{section.content}</p>
            )}
            {'items' in section && section.items && (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-[var(--text-muted)]">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
