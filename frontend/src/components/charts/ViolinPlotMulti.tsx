import { ViolinPlot } from './ViolinPlot';

interface ViolinPlotMultiProps {
  groups: Record<string, number[]>;
}

export function ViolinPlotMulti({ groups }: ViolinPlotMultiProps) {
  return <ViolinPlot groups={groups} />;
}
