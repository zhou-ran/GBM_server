/** LeftPanel — sidebar container for filters, color, patients, legend */

import { FilterPanel } from '../filters/FilterPanel';
import { ColorModeSelect } from '../color/ColorModeSelect';
import { Legend } from '../color/Legend';

export function LeftPanel() {
  return (
    <aside className="w-72 shrink-0 bg-[var(--surface)] border-r border-[var(--border)] overflow-y-auto p-3 flex flex-col gap-4">
      <FilterPanel />
      <ColorModeSelect />
      <Legend />
    </aside>
  );
}
