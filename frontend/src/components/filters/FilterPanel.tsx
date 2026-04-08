/** FilterPanel — schema-driven filter chips */

import { useDataStore } from '../../stores/dataStore';
import { useFilterStore } from '../../stores/filterStore';
import { FilterChip } from './FilterChip';

export function FilterPanel() {
  const schema = useDataStore((s) => s.schema);
  const filterableColumns = useFilterStore((s) => s.filterableColumns);
  const activeFilters = useFilterStore((s) => s.activeFilters);
  const toggleCategory = useFilterStore((s) => s.toggleCategory);

  if (!schema) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">
        Filters
      </h3>
      {schema.columns
        .filter((col) => filterableColumns.includes(col.name))
        .map((col) => (
          <div key={col.name}>
            <div className="text-xs text-[var(--text-muted)] mb-1">{col.name}</div>
            <div className="flex flex-wrap gap-1">
              {col.categories.map((cat, idx) => (
                <FilterChip
                  key={cat}
                  label={cat}
                  active={!activeFilters[col.name]?.size || activeFilters[col.name]?.has(idx)}
                  onClick={() => toggleCategory(col.name, idx)}
                />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
