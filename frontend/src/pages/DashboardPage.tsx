import { GlobalSidebar } from '../components/level1/GlobalSidebar';
import { HexbinMap } from '../components/level1/HexbinMap';
import { SummaryStatsBar } from '../components/level1/SummaryStatsBar';
import { useInitDashboardData } from '../hooks/useInitData';

export default function DashboardPage() {
  useInitDashboardData();

  return (
    <div className="flex h-full overflow-hidden">
      <GlobalSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <HexbinMap />
        <SummaryStatsBar />
      </div>
    </div>
  );
}
