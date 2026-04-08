import { useEffect, useMemo, useState } from 'react';
import { fetchArrowTable } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import { useClusterStats } from '../../hooks/useClusterStats';
import { useDataStore } from '../../stores/dataStore';
import { useColorStore } from '../../stores/colorStore';
import { CorrelationScatter } from '../charts/CorrelationScatter';
import { DotPlot } from '../charts/DotPlot';
import { ViolinPlotMulti } from '../charts/ViolinPlotMulti';
import { FeaturePlot } from './FeaturePlot';

export function GeneExplorer() {
  const { points, subtypeCounts } = useClusterStats();
  const schema = useDataStore((s) => s.schema);
  const senescence = useDataStore((s) => s.senescence);
  const ageCodes = useDataStore((s) => s.ageCodes);
  const idhCodes = useDataStore((s) => s.idhCodes);
  const deResults = useDataStore((s) => s.deResults);
  const selectedCellType = useClusterStats().selectedCellType;
  const geneExpr = useColorStore((s) => s.geneExpr);
  const signatureScore = useColorStore((s) => s.signatureScore);
  const colorMode = useColorStore((s) => s.colorMode);
  const featureValues = colorMode === 'signature' ? signatureScore : geneExpr;
  const [dotRows, setDotRows] = useState<string[]>([]);
  const [dotSize, setDotSize] = useState<number[][]>([]);
  const [dotColor, setDotColor] = useState<number[][]>([]);

  const topGenes = useMemo(
    () => (selectedCellType ? (deResults[selectedCellType] ?? []).slice(0, 5).map((gene) => gene.gene) : []),
    [deResults, selectedCellType],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadDotPlot() {
      if (topGenes.length === 0 || points.length === 0) {
        setDotRows([]);
        setDotSize([]);
        setDotColor([]);
        return;
      }

      const subtypeNames = Object.keys(subtypeCounts);
      const matrices = await Promise.all(
        topGenes.map(async (gene) => {
          const table = await fetchArrowTable(ENDPOINTS.gene(gene));
          return table.getChild('expression')!.toArray() as Float32Array;
        }),
      );

      if (cancelled) return;
      const sizeMatrix = topGenes.map(() => new Array(subtypeNames.length).fill(0));
      const colorMatrix = topGenes.map(() => new Array(subtypeNames.length).fill(0));

      topGenes.forEach((_, geneIndex) => {
        subtypeNames.forEach((subtype, subtypeIndex) => {
          const subtypePoints = points.filter((point) => point.subtype === subtype);
          if (subtypePoints.length === 0) return;
          let expressing = 0;
          let mean = 0;
          subtypePoints.forEach((point) => {
            const value = matrices[geneIndex][point.index];
            if (value > 0.05) expressing += 1;
            mean += value;
          });
          sizeMatrix[geneIndex][subtypeIndex] = expressing / subtypePoints.length;
          colorMatrix[geneIndex][subtypeIndex] = mean / subtypePoints.length;
        });
      });

      setDotRows(topGenes);
      setDotSize(sizeMatrix);
      setDotColor(colorMatrix);
    }

    void loadDotPlot();
    return () => {
      cancelled = true;
    };
  }, [points, subtypeCounts, topGenes]);

  const violinGroups = useMemo(() => {
    if (!featureValues || !ageCodes || !idhCodes || !schema) return {};
    const ageCategories = schema.columns.find((column) => column.name === 'age_Group5565')?.categories ?? [];
    const idhCategories = schema.columns.find((column) => column.name === 'IDH')?.categories ?? [];
    const groups: Record<string, number[]> = {};

    points.forEach((point) => {
      const ageLabel = ageCategories[ageCodes[point.index]] ?? 'Age';
      const idhLabel = idhCategories[idhCodes[point.index]] ?? 'IDH';
      const senLabel = (senescence?.[point.index] ?? 0) >= 0.3 ? 'Senescent' : 'Non-senescent';
      const value = featureValues[point.index];
      for (const label of [ageLabel, idhLabel, senLabel]) {
        groups[label] = groups[label] ?? [];
        groups[label].push(value);
      }
    });
    return groups;
  }, [ageCodes, featureValues, idhCodes, points, schema, senescence]);

  const scatterPoints = useMemo(() => {
    if (!featureValues || !senescence) return [];
    return points.map((point) => ({ x: featureValues[point.index], y: senescence[point.index] }));
  }, [featureValues, points, senescence]);

  return (
    <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-4 overflow-hidden p-4">
      <FeaturePlot />
      <ViolinPlotMulti groups={violinGroups} />
      <DotPlot rows={dotRows} columns={Object.keys(subtypeCounts)} sizeMatrix={dotSize} colorMatrix={dotColor} />
      <CorrelationScatter points={scatterPoints} />
    </div>
  );
}
