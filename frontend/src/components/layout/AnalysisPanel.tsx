/** AnalysisPanel — bottom panel with waterfall and correlation tabs */

import { useUIStore } from '../../stores/uiStore';
import { TabPanel } from '../common/TabPanel';

export function AnalysisPanel() {
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const tabs = [
    {
      id: 'waterfall' as const,
      label: 'DE Genes',
      content: (
        <div className="text-[var(--text-muted)] text-sm">
          Waterfall chart placeholder. This panel stays compatible while Level 2 analysis views are being rebuilt.
        </div>
      ),
    },
    {
      id: 'correlation' as const,
      label: 'Correlation',
      content: (
        <div className="text-[var(--text-muted)] text-sm">
          Correlation heatmap placeholder. The reusable tab container is now in place for later phases.
        </div>
      ),
    },
  ];

  return (
    <div className="h-64 shrink-0 bg-[var(--surface)] border-t border-[var(--border)] flex flex-col">
      <div className="flex-1 p-3 overflow-hidden">
        <TabPanel activeTab={activeTab} tabs={tabs} onTabChange={setActiveTab} />
      </div>
    </div>
  );
}
