import { useNavigationStore } from '../../stores/navigationStore';
import { GlobalSidebar } from '../level1/GlobalSidebar';
import { HexbinMap } from '../level1/HexbinMap';
import { SummaryStatsBar } from '../level1/SummaryStatsBar';
import { LeftPanel } from '../layout/LeftPanel';
import { AnalysisPanel } from '../layout/AnalysisPanel';
import { UmapView } from '../map/UmapView';

function PlaceholderLevel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <LeftPanel />
      <div className="flex flex-1 flex-col">
        <UmapView />
        <div className="border-t border-[var(--border)] bg-[#0e1621] p-4 text-sm text-[var(--text-muted)]">
          <div className="font-medium text-[var(--text)]">{title}</div>
          <div className="mt-1">{description}</div>
        </div>
        <AnalysisPanel />
      </div>
    </div>
  );
}

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
      <PlaceholderLevel
        title="Level 2: Sub-cluster Drill-down"
        description="Cell-level data is now lazy-loaded on first entry. The detailed Level 2 panels are the next TODO batch."
      />
    );
  }

  if (currentLevel === 3) {
    return (
      <PlaceholderLevel
        title="Level 3: Gene & Signature"
        description="Navigation context is wired. The gene search, signature builder, and correlation matrix remain pending."
      />
    );
  }

  return (
    <PlaceholderLevel
      title="Level 4: Trajectory & CellChat"
      description="Trajectory and CellChat depend on new preprocessing outputs and backend endpoints that are still pending."
    />
  );
}
