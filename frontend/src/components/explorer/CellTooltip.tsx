import { useMemo } from 'react';
import { Tooltip } from '../common/Tooltip';
import { useDataStore } from '../../stores/dataStore';

interface CellTooltipProps {
  cell: {
    index: number;
    x: number;
    y: number;
  };
}

function readCategory(
  categories: string[] | undefined,
  code: number | undefined,
  fallback: string,
) {
  if (!categories || code === undefined || code < 0) {
    return fallback;
  }
  return categories[code] ?? fallback;
}

export function CellTooltip({ cell }: CellTooltipProps) {
  const schema = useDataStore((s) => s.schema);
  const senescence = useDataStore((s) => s.senescence);
  const cellTypeCodes = useDataStore((s) => s.cellTypeCodes);
  const cellType2Codes = useDataStore((s) => s.cellType2Codes);
  const ageCodes = useDataStore((s) => s.ageCodes);
  const donorCodes = useDataStore((s) => s.donorCodes);

  const detail = useMemo(() => {
    if (!schema || !senescence || !cellTypeCodes || !cellType2Codes || !ageCodes || !donorCodes) {
      return null;
    }

    const categoryMap = (name: string) => schema.columns.find((column) => column.name === name)?.categories;
    return {
      cellType: readCategory(categoryMap('CellType'), cellTypeCodes[cell.index], 'Unknown'),
      subtype: readCategory(categoryMap('CellType_Level2'), cellType2Codes[cell.index], 'Unknown'),
      age: readCategory(categoryMap('age_Group5565'), ageCodes[cell.index], 'Unknown'),
      donor: readCategory(categoryMap('donor_id'), donorCodes[cell.index], 'Unknown'),
      senescence: senescence[cell.index],
    };
  }, [ageCodes, cell.index, cellType2Codes, cellTypeCodes, donorCodes, schema, senescence]);

  if (!detail) {
    return null;
  }

  return (
    <Tooltip x={cell.x} y={cell.y}>
      <div className="font-medium text-[var(--text)]">Cell {cell.index}</div>
      <div className="mt-1 text-[var(--text-muted)]">{detail.cellType}</div>
      <div className="text-[var(--text-muted)]">{detail.subtype}</div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[var(--text-muted)]">
        <span>Age</span>
        <span className="text-[var(--text)]">{detail.age}</span>
        <span>Donor</span>
        <span className="text-[var(--text)]">{detail.donor}</span>
        <span>Senescence</span>
        <span className="text-[var(--text)]">{detail.senescence.toFixed(3)}</span>
      </div>
    </Tooltip>
  );
}
