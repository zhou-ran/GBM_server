import { useEffect, useState } from 'react';
import { fetchJSON } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';

interface GeneAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
}

export function GeneAutocomplete({ value, onChange, onSelect }: GeneAutocompleteProps) {
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const genes = await fetchJSON<string[]>(ENDPOINTS.geneSearch(query));
        setResults(genes);
      } catch {
        setResults([]);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <div className="relative">
      <input
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--control-bg)] px-3 py-2 text-sm text-[var(--text)]"
        placeholder="Search gene"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] p-2 shadow-xl">
          {results.map((gene) => (
            <button
              key={gene}
              type="button"
              className="block w-full rounded-lg px-2 py-1 text-left text-sm hover:bg-[var(--control-bg-hover)]"
              onClick={() => {
                onChange(gene);
                onSelect(gene);
                setResults([]);
              }}
            >
              {gene}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
