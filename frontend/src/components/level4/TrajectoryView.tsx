import { useEffect } from 'react';
import { useNavigationStore } from '../../stores/navigationStore';
import { useTrajectoryStore } from '../../stores/trajectoryStore';
import { GeneTrendPlot } from '../charts/GeneTrendPlot';
import { LRHeatmap } from '../charts/LRHeatmap';
import { CellChatNetwork } from './CellChatNetwork';
import { PseudotimeMap } from './PseudotimeMap';

export function TrajectoryView() {
  const selectedCellType = useNavigationStore((s) => s.selectedCellType);
  const loadTrajectory = useTrajectoryStore((s) => s.loadTrajectory);
  const loadCellchat = useTrajectoryStore((s) => s.loadCellchat);
  const trends = useTrajectoryStore((s) => s.trajectoryGenes);
  const cellchat = useTrajectoryStore((s) => s.cellchat);
  const pathway = useTrajectoryStore((s) => s.selectedPathway);

  useEffect(() => {
    if (selectedCellType) {
      void loadTrajectory(selectedCellType);
    }
    void loadCellchat();
  }, [loadCellchat, loadTrajectory, selectedCellType]);

  return (
    <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-4 overflow-hidden p-4">
      <PseudotimeMap />
      <GeneTrendPlot trends={trends} />
      <CellChatNetwork data={cellchat} pathway={pathway} />
      <LRHeatmap data={cellchat} pathway={pathway} />
    </div>
  );
}
