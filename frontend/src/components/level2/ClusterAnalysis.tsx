import { useNavigate } from 'react-router-dom';
import { useFilterStore } from '../../stores/filterStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { useUIStore } from '../../stores/uiStore';
import { useClusterStats } from '../../hooks/useClusterStats';
import { PatientTable } from '../charts/PatientTable';
import { ViolinPlot } from '../charts/ViolinPlot';
import { WaterfallChart } from '../charts/WaterfallChart';
import { TabPanel } from '../common/TabPanel';
import { SubtypeBreakdown } from './SubtypeBreakdown';

export function ClusterAnalysis() {
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const highlightDonor = useFilterStore((s) => s.highlightDonor);
  const setSelectedGene = useNavigationStore((s) => s.setSelectedGene);
  const navigate = useNavigate();
  const { subtypeCounts, subtypeSenescence, filteredPatients, deGenes } = useClusterStats();

  const tabs = [
    {
      id: 'waterfall' as const,
      label: 'Sub-types',
      content: <SubtypeBreakdown counts={subtypeCounts} />,
    },
    {
      id: 'correlation' as const,
      label: 'Senescence',
      content: <ViolinPlot groups={subtypeSenescence} />,
    },
  ];

  return (
    <div className="grid h-80 shrink-0 grid-cols-3 gap-4 border-t border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
        <TabPanel activeTab={activeTab} tabs={tabs} onTabChange={setActiveTab} />
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
        <div className="mb-3 text-sm font-semibold">Patient Breakdown</div>
        <PatientTable rows={filteredPatients} onSelect={highlightDonor} />
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
        <div className="mb-3 text-sm font-semibold">DE Waterfall</div>
        <WaterfallChart
          genes={deGenes}
          onSelectGene={(gene) => {
            setSelectedGene(gene);
            navigate('/explorer');
          }}
        />
      </div>
    </div>
  );
}
