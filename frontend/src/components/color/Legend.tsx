/** Legend — categorical or continuous color legend */

import { useColorStore } from '../../stores/colorStore';
import { useDataStore } from '../../stores/dataStore';
import { CELLTYPE_COLORS } from '../../lib/colors';

export function Legend() {
  const colorMode = useColorStore((s) => s.colorMode);
  const schema = useDataStore((s) => s.schema);

  if (!schema) return null;

  if (colorMode === 'celltype') {
    const col = schema.columns.find((c) => c.name === 'CellType');
    if (!col) return null;
    return (
      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">
          Legend
        </h3>
        {col.categories.map((cat, i) => {
          const c = CELLTYPE_COLORS[i] ?? [128, 128, 128, 200];
          return (
            <div key={cat} className="flex items-center gap-2 text-xs">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ backgroundColor: `rgba(${c[0]},${c[1]},${c[2]},0.8)` }}
              />
              <span>{cat}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (colorMode === 'senescence' || colorMode === 'gene' || colorMode === 'signature' || colorMode === 'age' || colorMode === 'idh') {
    return (
      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">
          Legend
        </h3>
        <div
          className="h-3 rounded"
          style={{
            background: 'linear-gradient(to right, #0000ff, #ffff00, #ff0000)',
          }}
        />
        <div className="flex justify-between text-xs text-[var(--text-muted)]">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    );
  }

  return null;
}
