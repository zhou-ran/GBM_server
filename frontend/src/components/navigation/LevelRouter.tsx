import { useNavigationStore } from '../../stores/navigationStore';
import { GlobalSidebar } from '../level1/GlobalSidebar';
import { HexbinMap } from '../level1/HexbinMap';
import { SummaryStatsBar } from '../level1/SummaryStatsBar';
import { ClusterAnalysis } from '../level2/ClusterAnalysis';
import { ClusterSidebar } from '../level2/ClusterSidebar';
import { ClusterView } from '../level2/ClusterView';
import { GeneExplorer } from '../level3/GeneExplorer';
import { GeneSidebar } from '../level3/GeneSidebar';
import { TrajectorySidebar } from '../level4/TrajectorySidebar';
import { TrajectoryView } from '../level4/TrajectoryView';

export function LevelRouter() {
  const currentLevel = useNavigationStore((s) => s.currentLevel);

  if (currentLevel === 1) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <GlobalSidebar />
        <div className="flex flex-1 flex-col">
          <HexbinMap />
          <SummaryStatsBar />
        </div>
      </div>
    );
  }

  if (currentLevel === 2) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <ClusterSidebar />
        <div className="flex flex-1 flex-col">
          <ClusterView />
          <ClusterAnalysis />
        </div>
      </div>
    );
  }

  if (currentLevel === 3) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <GeneSidebar />
        <GeneExplorer />
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <TrajectorySidebar />
      <TrajectoryView />
    </div>
  );
}
