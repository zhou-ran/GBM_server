import { useEffect, useState } from 'react';
import { Outlet, useMatch, useNavigate } from 'react-router-dom';
import { CellDrawer } from '../components/cell-profiler/CellDrawer';
import { CellTooltip } from '../components/explorer/CellTooltip';
import { AnalysisPanel } from '../components/layout/AnalysisPanel';
import { LeftPanel } from '../components/layout/LeftPanel';
import { UmapView } from '../components/map/UmapView';
import { useInitExplorerData } from '../hooks/useInitData';
import { useNavigationStore } from '../stores/navigationStore';
import { useFilterStore } from '../stores/filterStore';
import { useViewStore } from '../stores/viewStore';

export default function ExplorerPage() {
  useInitExplorerData();
  const navigate = useNavigate();
  const cellMatch = useMatch('/explorer/cell/:cellId');
  const selectedCellType = useNavigationStore((s) => s.selectedCellType);
  const setCellTypeFilter = useFilterStore((s) => s.setCellTypeFilter);
  const renderMode = useViewStore((s) => s.renderMode);
  const [hoveredCell, setHoveredCell] = useState<{ index: number; x: number; y: number } | null>(null);

  useEffect(() => {
    setCellTypeFilter(selectedCellType);
  }, [selectedCellType, setCellTypeFilter]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--bg)]">
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel />
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full border border-[var(--border)] bg-[var(--surface-overlay)] px-3 py-1 text-xs text-[var(--text-muted)] shadow-sm">
            Explorer {selectedCellType ? `• ${selectedCellType}` : '• all major cell types'} • {renderMode}
          </div>
          <UmapView
            onCellClick={(cellId) => navigate(`/explorer/cell/${cellId}`)}
            onCellHover={setHoveredCell}
          />
          {hoveredCell && <CellTooltip cell={hoveredCell} />}
        </div>
      </div>
      <AnalysisPanel />
      {cellMatch?.params.cellId && (
        <CellDrawer
          cellId={cellMatch.params.cellId}
          onClose={() => navigate('/explorer')}
        />
      )}
      <Outlet />
    </div>
  );
}
