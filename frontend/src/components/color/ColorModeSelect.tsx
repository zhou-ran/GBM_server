/** ColorModeSelect — dropdown for color mode + gene search */

import { useState } from 'react';
import { useColorStore } from '../../stores/colorStore';
import type { ColorMode } from '../../types/data';

export function ColorModeSelect() {
  const colorMode = useColorStore((s) => s.colorMode);
  const setColorMode = useColorStore((s) => s.setColorMode);
  const loadGene = useColorStore((s) => s.loadGene);
  const isLoadingGene = useColorStore((s) => s.isLoadingGene);
  const geneName = useColorStore((s) => s.geneName);
  const [geneInput, setGeneInput] = useState('');

  const handleGeneLoad = async () => {
    if (!geneInput.trim()) return;
    await loadGene(geneInput.trim());
    setGeneInput('');
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">
        Color By
      </h3>
      <select
        className="bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--text)]"
        value={colorMode}
        onChange={(e) => setColorMode(e.target.value as ColorMode)}
      >
        <option value="celltype">Cell Type</option>
        <option value="celltype2">Cell Type Level 2</option>
        <option value="senescence">Senescence Score</option>
        <option value="gene">Gene Expression</option>
      </select>

      {(colorMode === 'gene' || geneName) && (
        <div className="flex gap-1">
          <input
            className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--text)]"
            placeholder="Gene name (e.g. APOE)"
            value={geneInput}
            onChange={(e) => setGeneInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGeneLoad()}
          />
          <button
            className="px-2 py-1 text-sm bg-[var(--accent)] text-white rounded disabled:opacity-50"
            onClick={handleGeneLoad}
            disabled={isLoadingGene || !geneInput.trim()}
          >
            {isLoadingGene ? '...' : 'Load'}
          </button>
        </div>
      )}
      {geneName && (
        <div className="text-xs text-[var(--text-muted)]">
          Showing: {geneName}
        </div>
      )}
    </div>
  );
}
