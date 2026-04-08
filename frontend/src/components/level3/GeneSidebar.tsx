import { useEffect, useState } from 'react';
import { useColorStore } from '../../stores/colorStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { GeneAutocomplete } from './GeneAutocomplete';
import { SignaturePresets } from './SignaturePresets';

export function GeneSidebar() {
  const selectedGene = useNavigationStore((s) => s.selectedGene);
  const selectedCellType = useNavigationStore((s) => s.selectedCellType);
  const selectedSubCluster = useNavigationStore((s) => s.selectedSubCluster);
  const loadGene = useColorStore((s) => s.loadGene);
  const geneName = useColorStore((s) => s.geneName);
  const signatureName = useColorStore((s) => s.signatureName);
  const isLoadingGene = useColorStore((s) => s.isLoadingGene);
  const [query, setQuery] = useState(selectedGene ?? '');

  useEffect(() => {
    if (selectedGene && selectedGene !== geneName) {
      void loadGene(selectedGene);
      setQuery(selectedGene);
    }
  }, [geneName, loadGene, selectedGene]);

  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[#0f1722] px-4 py-4">
      <section className="rounded-2xl border border-[var(--border)] bg-white/3 p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Level 3</div>
        <h2 className="mt-2 text-lg font-semibold">{selectedSubCluster ?? selectedCellType ?? 'Gene Explorer'}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Load a gene or signature and inspect expression across the current drill-down context.</p>
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--border)] bg-white/3 p-4">
        <h3 className="mb-3 text-sm font-semibold">Gene Search</h3>
        <GeneAutocomplete
          value={query}
          onChange={setQuery}
          onSelect={(gene) => void loadGene(gene)}
        />
        <button
          type="button"
          className="mt-3 w-full rounded-xl bg-[var(--accent)] px-3 py-2 text-sm text-white disabled:opacity-50"
          onClick={() => void loadGene(query)}
          disabled={isLoadingGene || !query.trim()}
        >
          {isLoadingGene ? 'Loading...' : 'Load Gene'}
        </button>
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--border)] bg-white/3 p-4">
        <h3 className="mb-3 text-sm font-semibold">Signature Presets</h3>
        <SignaturePresets />
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--border)] bg-white/3 p-4 text-sm">
        <div className="text-[var(--text-muted)]">Selected feature</div>
        <div className="mt-2 font-medium">{signatureName ?? geneName ?? 'None loaded'}</div>
      </section>
    </aside>
  );
}
