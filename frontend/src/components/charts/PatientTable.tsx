import { useMemo, useState } from 'react';

type SortKey = 'donor_id' | 'n_cells' | 'IDH' | 'stage' | 'age_group' | 'sex' | 'senescence_mean';

interface PatientRow {
  donor_id: string;
  n_cells: number;
  IDH: string;
  stage: string;
  age_group: string;
  sex: string;
  senescence_mean: number;
  donorIndex: number;
}

interface PatientTableProps {
  rows: PatientRow[];
  onSelect: (donorIndex: number) => void;
}

export function PatientTable({ rows, onSelect }: PatientTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('n_cells');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      if (left === right) return 0;
      const order = left > right ? 1 : -1;
      return sortDir === 'asc' ? order : -order;
    });
  }, [rows, sortDir, sortKey]);

  const columns: { key: SortKey; label: string }[] = [
    { key: 'donor_id', label: 'Donor' },
    { key: 'n_cells', label: 'Cells' },
    { key: 'IDH', label: 'IDH' },
    { key: 'stage', label: 'Stage' },
    { key: 'age_group', label: 'Age' },
    { key: 'sex', label: 'Sex' },
    { key: 'senescence_mean', label: 'Senescence' },
  ];

  return (
    <div className="h-full overflow-auto rounded-2xl border border-[var(--border)]">
      <table className="min-w-full text-left text-sm">
        <thead className="sticky top-0 bg-[var(--surface-raised)] text-[var(--text-muted)]">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-2 font-medium">
                <button
                  type="button"
                  className="text-left"
                  onClick={() => {
                    if (sortKey === column.key) {
                      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortKey(column.key);
                      setSortDir(column.key === 'donor_id' ? 'asc' : 'desc');
                    }
                  }}
                >
                  {column.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr
              key={row.donor_id}
              className="border-t border-[var(--border)] hover:bg-[var(--control-bg)]"
              onClick={() => onSelect(row.donorIndex)}
            >
              <td className="px-3 py-2">{row.donor_id}</td>
              <td className="px-3 py-2">{row.n_cells.toLocaleString()}</td>
              <td className="px-3 py-2">{row.IDH}</td>
              <td className="px-3 py-2">{row.stage}</td>
              <td className="px-3 py-2">{row.age_group}</td>
              <td className="px-3 py-2">{row.sex}</td>
              <td className="px-3 py-2">{row.senescence_mean.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
