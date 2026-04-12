/** Legend — categorical or continuous color legend */

import { useColorStore } from '../../stores/colorStore';
import { useDataStore } from '../../stores/dataStore';
import { AGE_GROUP_COLORS, CELLTYPE_COLORS, IDH_COLORS } from '../../lib/colors';
import { paletteCss } from '../../lib/colorScales';

function CategoryLegend({
  items,
}: {
  items: Array<{ label: string; color: [number, number, number, number] }>;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Legend
      </h3>
      {items.map(({ label, color }) => (
        <div key={label} className="flex items-center gap-2 text-xs text-[var(--text)]">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: paletteCss(color) }}
          />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend() {
  const colorMode = useColorStore((s) => s.colorMode);
  const geneName = useColorStore((s) => s.geneName);
  const signatureName = useColorStore((s) => s.signatureName);
  const schema = useDataStore((s) => s.schema);

  if (!schema) return null;

  if (colorMode === 'celltype') {
    const col = schema.columns.find((c) => c.name === 'CellType');
    if (!col) return null;
    return <CategoryLegend items={col.categories.map((label, i) => ({ label, color: CELLTYPE_COLORS[i] ?? [128, 128, 128, 200] }))} />;
  }

  if (colorMode === 'celltype2') {
    const col = schema.columns.find((c) => c.name === 'CellType_Level2');
    if (!col) return null;
    return (
      <CategoryLegend
        items={col.categories.slice(0, 12).map((label, i) => ({
          label,
          color: CELLTYPE_COLORS[i % CELLTYPE_COLORS.length] ?? [128, 128, 128, 200],
        }))}
      />
    );
  }

  if (colorMode === 'age') {
    const col = schema.columns.find((c) => c.name === 'age_Group5565');
    if (!col) return null;
    return (
      <CategoryLegend
        items={col.categories.map((label, i) => ({
          label,
          color: AGE_GROUP_COLORS[i] ?? [128, 128, 128, 200],
        }))}
      />
    );
  }

  if (colorMode === 'idh') {
    const col = schema.columns.find((c) => c.name === 'IDH');
    if (!col) return null;
    return (
      <CategoryLegend
        items={col.categories.map((label, i) => ({
          label,
          color: IDH_COLORS[i] ?? [128, 128, 128, 200],
        }))}
      />
    );
  }

  if (colorMode === 'senescence' || colorMode === 'gene' || colorMode === 'signature') {
    return (
      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">
          Legend
        </h3>
        <div className="text-xs text-[var(--text-muted)]">
          {colorMode === 'gene'
            ? `Feature: ${geneName ?? 'Gene expression'}`
            : colorMode === 'signature'
              ? `Feature: ${signatureName ?? 'Signature score'}`
              : 'Feature: Senescence score'}
        </div>
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
