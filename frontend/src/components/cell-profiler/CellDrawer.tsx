import { useMemo } from 'react';
import { useDataStore } from '../../stores/dataStore';
import { readSchemaCategory } from '../../lib/schema';

interface CellDrawerProps {
  cellId: string;
  onClose: () => void;
}

export function CellDrawer({ cellId, onClose }: CellDrawerProps) {
  const index = Number.parseInt(cellId, 10);
  const schema = useDataStore((s) => s.schema);
  const coords = useDataStore((s) => s.coords);
  const senescence = useDataStore((s) => s.senescence);
  const cellTypeCodes = useDataStore((s) => s.cellTypeCodes);
  const cellType2Codes = useDataStore((s) => s.cellType2Codes);
  const idhCodes = useDataStore((s) => s.idhCodes);
  const stageCodes = useDataStore((s) => s.stageCodes);
  const ageCodes = useDataStore((s) => s.ageCodes);
  const sexCodes = useDataStore((s) => s.sexCodes);
  const donorCodes = useDataStore((s) => s.donorCodes);
  const sampleCodes = useDataStore((s) => s.sampleCodes);

  const summary = useMemo(() => {
    if (
      !schema ||
      !coords ||
      !senescence ||
      !cellTypeCodes ||
      !cellType2Codes ||
      !idhCodes ||
      !stageCodes ||
      !ageCodes ||
      !sexCodes ||
      !donorCodes ||
      !sampleCodes ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= senescence.length
    ) {
      return null;
    }

    return {
      x: coords[index * 2],
      y: coords[index * 2 + 1],
      senescence: senescence[index],
      cellType: readSchemaCategory(schema, 'CellType', cellTypeCodes[index], 'Unavailable'),
      subtype: readSchemaCategory(schema, 'CellType_Level2', cellType2Codes[index], 'Unavailable'),
      idh: readSchemaCategory(schema, 'IDH', idhCodes[index], 'Unavailable'),
      stage: readSchemaCategory(schema, 'stage', stageCodes[index], 'Unavailable'),
      age: readSchemaCategory(schema, 'age_Group5565', ageCodes[index], 'Unavailable'),
      sex: readSchemaCategory(schema, 'sex', sexCodes[index], 'Unavailable'),
      donor: readSchemaCategory(schema, 'donor_id', donorCodes[index], 'Unavailable'),
      sample: readSchemaCategory(schema, 'Sample', sampleCodes[index], 'Unavailable'),
    };
  }, [ageCodes, cellType2Codes, cellTypeCodes, coords, donorCodes, idhCodes, index, sampleCodes, schema, senescence, sexCodes, stageCodes]);

  return (
    <div className="absolute inset-y-0 right-0 z-30 flex w-full justify-end bg-black/10 backdrop-blur-[1px]">
      <aside className="flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--surface-raised)] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Cell Profiler</div>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">Cell {cellId}</h2>
          </div>
          <button
            type="button"
            className="rounded-full border border-[var(--border)] px-3 py-1 text-sm text-[var(--text-muted)] hover:bg-[var(--control-bg)]"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {!summary ? (
          <div className="px-5 py-6 text-sm text-[var(--text-muted)]">
            Cell detail is unavailable for this id. Open the explorer after the cell-level dataset loads, or choose a
            valid index from the UMAP.
          </div>
        ) : (
          <div className="space-y-6 overflow-y-auto px-5 py-6">
            <section className="grid grid-cols-2 gap-3">
              {[
                ['Cell type', summary.cellType],
                ['Subtype', summary.subtype],
                ['Donor', summary.donor],
                ['Sample', summary.sample],
                ['IDH', summary.idh],
                ['Stage', summary.stage],
                ['Age group', summary.age],
                ['Sex', summary.sex],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</div>
                  <div className="mt-2 text-sm font-medium text-[var(--text)]">{value}</div>
                </div>
              ))}
            </section>

            <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Quantitative</div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-[var(--text-muted)]">Senescence</div>
                  <div className="mt-1 text-lg font-semibold">{summary.senescence.toFixed(3)}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-muted)]">UMAP X</div>
                  <div className="mt-1 text-lg font-semibold">{summary.x.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-muted)]">UMAP Y</div>
                  <div className="mt-1 text-lg font-semibold">{summary.y.toFixed(2)}</div>
                </div>
              </div>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}
