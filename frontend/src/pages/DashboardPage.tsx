import { DashboardGrid } from '../components/level1/DashboardGrid';
import { useInitDashboardData } from '../hooks/useInitData';

export default function DashboardPage() {
  useInitDashboardData();

  return <DashboardGrid />;
}
