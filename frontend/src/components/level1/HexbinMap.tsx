import { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView, type PickingInfo } from '@deck.gl/core';
import { PolygonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../../stores/dataStore';
import { useColorStore } from '../../stores/colorStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { useThemeStore } from '../../stores/themeStore';
import { useViewStore } from '../../stores/viewStore';
import { ageGroupColor, categoricalColor, idhColor } from '../../lib/colorScales';
import { mapBackground, senescenceColor, textLabelTheme } from '../../lib/colors';
import { DASHBOARD_SAMPLE_SIZE } from '../../lib/constants';
import { Tooltip } from '../common/Tooltip';
import type { HexbinBin } from '../../types/data';

const VIEW = new OrthographicView({ id: 'level1-ortho', flipY: false });

type SampledCell = {
  index: number;
  position: [number, number];
  cellTypeCode: number;
  cellTypeName: string;
  senescence: number;
};

type LabelPoint = {
  label: string;
  position: [number, number];
};

function buildHexagon(x: number, y: number, radius: number): [number, number][] {
  return new Array(6).fill(null).map((_, index) => {
    const angle = (Math.PI / 3) * index;
    return [x + radius * Math.cos(angle), y + radius * Math.sin(angle)];
  });
}

function buildSampledCells(
  coords: Float32Array,
  cellTypeCodes: Uint8Array,
  senescence: Float32Array,
  cellTypeNames: string[],
  sampleSize: number,
): SampledCell[] {
  const total = cellTypeCodes.length;
  if (total === 0) {
    return [];
  }

  let maxCode = 0;
  for (let i = 0; i < total; i++) {
    if (cellTypeCodes[i] > maxCode) {
      maxCode = cellTypeCodes[i];
    }
  }

  const categoryCount = Math.max(cellTypeNames.length, maxCode + 1);
  const counts = new Array<number>(categoryCount).fill(0);
  for (let i = 0; i < total; i++) {
    counts[cellTypeCodes[i]] += 1;
  }

  const cappedSize = Math.min(sampleSize, total);
  const quotas = counts.map((count) => (count > 0 ? Math.max(1, Math.floor((count / total) * cappedSize)) : 0));
  let assigned = quotas.reduce((sum, count) => sum + count, 0);

  if (assigned < cappedSize) {
    const remainderOrder = counts
      .map((count, code) => ({
        code,
        remainder: count > 0 ? (count / total) * cappedSize - quotas[code] : -1,
      }))
      .sort((a, b) => b.remainder - a.remainder);

    let pointer = 0;
    while (assigned < cappedSize && remainderOrder.length > 0) {
      const { code } = remainderOrder[pointer];
      if (counts[code] > quotas[code]) {
        quotas[code] += 1;
        assigned += 1;
      }
      pointer = (pointer + 1) % remainderOrder.length;
    }
  } else if (assigned > cappedSize) {
    const reductionOrder = counts
      .map((count, code) => ({ code, count }))
      .sort((a, b) => b.count - a.count);

    let pointer = 0;
    while (assigned > cappedSize && reductionOrder.length > 0) {
      const { code } = reductionOrder[pointer];
      if (quotas[code] > 1) {
        quotas[code] -= 1;
        assigned -= 1;
      }
      pointer = (pointer + 1) % reductionOrder.length;
    }
  }

  const seen = new Array<number>(categoryCount).fill(0);
  const selected = new Array<number>(categoryCount).fill(0);
  const sampled: SampledCell[] = [];

  for (let i = 0; i < total; i++) {
    const code = cellTypeCodes[i];
    seen[code] += 1;
    if (quotas[code] === 0) {
      continue;
    }

    const nextSelected = Math.floor((seen[code] * quotas[code]) / counts[code]);
    if (nextSelected <= selected[code]) {
      continue;
    }

    selected[code] = nextSelected;
    sampled.push({
      index: i,
      position: [coords[i * 2], coords[i * 2 + 1]],
      cellTypeCode: code,
      cellTypeName: cellTypeNames[code] ?? 'Unknown',
      senescence: senescence[i] ?? 0,
    });
  }

  return sampled;
}

export function HexbinMap() {
  const hexbin = useDataStore((s) => s.hexbin);
  const centroids = useDataStore((s) => s.centroids);
  const schema = useDataStore((s) => s.schema);
  const coords = useDataStore((s) => s.coords);
  const senescence = useDataStore((s) => s.senescence);
  const cellTypeCodes = useDataStore((s) => s.cellTypeCodes);
  const cellType2Codes = useDataStore((s) => s.cellType2Codes);
  const ageCodes = useDataStore((s) => s.ageCodes);
  const idhCodes = useDataStore((s) => s.idhCodes);
  const loadLevel2 = useDataStore((s) => s.loadLevel2);
  const isLevel2Loaded = useDataStore((s) => s.isLevel2Loaded);
  const colorMode = useColorStore((s) => s.colorMode);
  const geneExpr = useColorStore((s) => s.geneExpr);
  const signatureScore = useColorStore((s) => s.signatureScore);
  const viewState = useViewStore((s) => s.viewState);
  const setViewState = useViewStore((s) => s.setViewState);
  const setSelectedCellType = useNavigationStore((s) => s.setSelectedCellType);
  const theme = useThemeStore((s) => s.theme);
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<
    | { x: number; y: number; kind: 'bin'; bin: HexbinBin }
    | { x: number; y: number; kind: 'cell'; cell: SampledCell }
    | null
  >(null);
  const labelTheme = textLabelTheme(theme);

  const bins = useMemo(() => hexbin?.bins ?? [], [hexbin]);
  const cellTypeNames = useMemo(
    () => hexbin?.celltype_names ?? schema?.columns.find((column) => column.name === 'CellType')?.categories ?? [],
    [hexbin, schema],
  );
  const cellType2Names = useMemo(
    () => schema?.columns.find((column) => column.name === 'CellType_Level2')?.categories ?? [],
    [schema],
  );
  const ageGroupNames = useMemo(
    () => schema?.columns.find((column) => column.name === 'age_Group5565')?.categories ?? [],
    [schema],
  );
  const idhNames = useMemo(
    () => schema?.columns.find((column) => column.name === 'IDH')?.categories ?? [],
    [schema],
  );

  const sampledCells = useMemo(() => {
    if (!coords || !senescence || !cellTypeCodes) {
      return [];
    }
    return buildSampledCells(coords, cellTypeCodes, senescence, cellTypeNames, DASHBOARD_SAMPLE_SIZE);
  }, [cellTypeCodes, cellTypeNames, coords, senescence]);

  const useSampledScatter = sampledCells.length > 0;

  const labelPoints = useMemo<LabelPoint[]>(() => {
    if (!useSampledScatter) {
      if (colorMode === 'celltype') {
        return centroids.map((centroid) => ({
          label: centroid.name,
          position: [centroid.x, centroid.y],
        }));
      }
      return [];
    }

    if (colorMode === 'senescence' || colorMode === 'gene' || colorMode === 'signature') {
      return [];
    }

    const buckets = new Map<string, { x: number; y: number; count: number }>();
    for (const cell of sampledCells) {
      let label: string | null = null;
      if (colorMode === 'celltype') {
        label = cell.cellTypeName;
      } else if (colorMode === 'celltype2' && cellType2Codes) {
        label = cellType2Names[cellType2Codes[cell.index]] ?? null;
      } else if (colorMode === 'age' && ageCodes) {
        label = ageGroupNames[ageCodes[cell.index]] ?? null;
      } else if (colorMode === 'idh' && idhCodes) {
        label = idhNames[idhCodes[cell.index]] ?? null;
      }

      if (!label) {
        continue;
      }

      const bucket = buckets.get(label) ?? { x: 0, y: 0, count: 0 };
      bucket.x += cell.position[0];
      bucket.y += cell.position[1];
      bucket.count += 1;
      buckets.set(label, bucket);
    }

    return Array.from(buckets.entries())
      .map(([label, bucket]) => ({
        label,
        position: [bucket.x / bucket.count, bucket.y / bucket.count] as [number, number],
        count: bucket.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, colorMode === 'celltype2' ? 12 : 9)
      .map(({ label, position }) => ({ label, position }));
  }, [ageCodes, ageGroupNames, cellType2Codes, cellType2Names, centroids, colorMode, idhCodes, idhNames, sampledCells, useSampledScatter]);

  useEffect(() => {
    if (isLevel2Loaded) {
      return;
    }
    void loadLevel2().catch((error) => {
      console.error('Dashboard level2 preload failed:', error);
    });
  }, [isLevel2Loaded, loadLevel2]);

  const layers = useMemo(() => {
    if (useSampledScatter) {
      return [
        new ScatterplotLayer({
          id: 'level1-sampled-cells',
          data: sampledCells,
          pickable: true,
          opacity: 0.9,
          stroked: false,
          filled: true,
          radiusUnits: 'pixels',
          getPosition: (d: SampledCell) => d.position,
          getRadius: 2.2,
          radiusMinPixels: 1.5,
          radiusMaxPixels: 4,
          getFillColor: (d: SampledCell) => {
            if (colorMode === 'gene' && geneExpr) {
              return senescenceColor(geneExpr[d.index]);
            }
            if (colorMode === 'signature' && signatureScore) {
              return senescenceColor(signatureScore[d.index]);
            }
            if (colorMode === 'celltype2' && cellType2Codes) {
              return categoricalColor(cellType2Codes[d.index]);
            }
            if (colorMode === 'age' && ageCodes) {
              return ageGroupColor(ageCodes[d.index]);
            }
            if (colorMode === 'idh' && idhCodes) {
              return idhColor(idhCodes[d.index]);
            }
            if (colorMode === 'senescence') {
              return senescenceColor(d.senescence);
            }
            return categoricalColor(d.cellTypeCode);
          },
          onClick: (info: PickingInfo<SampledCell>) => {
            if (!info.object) return;
            setSelectedCellType(info.object.cellTypeName);
            navigate('/explorer');
          },
          onHover: (info: PickingInfo<SampledCell>) => {
            if (!info.object || info.x === undefined || info.y === undefined) {
              setHovered(null);
              return;
            }
            setHovered({ x: info.x, y: info.y, kind: 'cell', cell: info.object });
          },
          updateTriggers: {
            getFillColor: [ageCodes, cellType2Codes, colorMode, geneExpr, idhCodes, signatureScore],
          },
        }),
        new TextLayer({
          id: 'level1-centroids',
          data: labelPoints,
          pickable: true,
          getPosition: (d: LabelPoint) => d.position,
          getText: (d: LabelPoint) => d.label,
          getSize: 14,
          getColor: labelTheme.text,
          fontWeight: 700,
          fontSettings: { sdf: true },
          outlineColor: labelTheme.outline,
          outlineWidth: 3,
          onClick: (info: PickingInfo<LabelPoint>) => {
            if (!info.object) return;
            if (colorMode === 'celltype') {
              setSelectedCellType(info.object.label);
              navigate('/explorer');
            }
          },
        }),
      ];
    }

    const polygonData = bins.map((bin) => ({
      ...bin,
      polygon: buildHexagon(bin.x, bin.y, hexbin?.radius ?? 0.25),
      label: cellTypeNames[bin.dominant_celltype] ?? 'Unknown',
    }));

    return [
      new PolygonLayer({
        id: 'level1-hexbins',
        data: polygonData,
        filled: true,
        stroked: true,
        pickable: true,
        lineWidthMinPixels: 1,
        getPolygon: (d: (typeof polygonData)[number]) => d.polygon,
        getLineColor: theme === 'dark' ? [255, 255, 255, 20] : [31, 35, 40, 35],
        getFillColor: (d: (typeof polygonData)[number]) => {
          if (colorMode === 'senescence') return senescenceColor(d.senescence_mean);
          return categoricalColor(d.dominant_celltype);
        },
        onClick: (info: PickingInfo<(typeof polygonData)[number]>) => {
          if (!info.object) return;
          setSelectedCellType(info.object.label);
          navigate('/explorer');
        },
        onHover: (info: PickingInfo<(typeof polygonData)[number]>) => {
          if (!info.object || info.x === undefined || info.y === undefined) {
            setHovered(null);
            return;
          }
          setHovered({ x: info.x, y: info.y, kind: 'bin', bin: info.object });
        },
      }),
      new TextLayer({
        id: 'level1-centroids',
        data: colorMode === 'celltype' ? labelPoints : [],
        pickable: true,
        getPosition: (d: LabelPoint) => d.position,
        getText: (d: LabelPoint) => d.label,
        getSize: 14,
        getColor: labelTheme.text,
        fontWeight: 700,
        fontSettings: { sdf: true },
        outlineColor: labelTheme.outline,
        outlineWidth: 3,
        onClick: (info: PickingInfo<LabelPoint>) => {
          if (!info.object) return;
          setSelectedCellType(info.object.label);
          navigate('/explorer');
        },
      }),
    ];
  }, [
    ageGroupNames,
    bins,
    cellType2Names,
    cellTypeNames,
    colorMode,
    geneExpr,
    hexbin?.radius,
    labelPoints,
    idhCodes,
    idhNames,
    labelTheme.outline,
    labelTheme.text,
    navigate,
    sampledCells,
    setSelectedCellType,
    signatureScore,
    theme,
    useSampledScatter,
    ageCodes,
    cellType2Codes,
  ]);

  return (
    <div className="relative flex-1">
      <DeckGL
        views={VIEW}
        controller={true}
        viewState={viewState}
        style={{ background: mapBackground(theme) }}
        layers={layers}
        onViewStateChange={({ viewState: next }) =>
          setViewState({
            target: Array.isArray(next.target) && next.target.length === 2
              ? [next.target[0], next.target[1], 0]
              : (next.target as [number, number, number]) ?? viewState.target,
            zoom: typeof next.zoom === 'number' ? next.zoom : viewState.zoom,
          })}
      />
      <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-[var(--border)] bg-[var(--surface-overlay)] px-3 py-1 text-xs text-[var(--text-muted)] shadow-sm">
        {useSampledScatter
          ? `${sampledCells.length.toLocaleString()} sampled cells • WebGL overview • click to drill down`
          : `${bins.length.toLocaleString()} hexbins • loading cell-level overview`}
      </div>
      {hovered && (
        <Tooltip x={hovered.x} y={hovered.y}>
          {hovered.kind === 'cell' ? (
            <>
              <div className="font-medium text-[var(--text)]">{hovered.cell.cellTypeName}</div>
              <div className="mt-1 text-[var(--text-muted)]">sampled cell #{hovered.cell.index.toLocaleString()}</div>
              <div className="text-[var(--text-muted)]">senescence {hovered.cell.senescence.toFixed(3)}</div>
            </>
          ) : (
            <>
              <div className="font-medium text-[var(--text)]">{cellTypeNames[hovered.bin.dominant_celltype] ?? 'Unknown'}</div>
              <div className="mt-1 text-[var(--text-muted)]">{hovered.bin.count.toLocaleString()} cells</div>
              <div className="text-[var(--text-muted)]">senescence {hovered.bin.senescence_mean.toFixed(3)}</div>
            </>
          )}
        </Tooltip>
      )}
    </div>
  );
}
