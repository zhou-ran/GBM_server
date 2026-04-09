import { useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView, type PickingInfo } from '@deck.gl/core';
import { PolygonLayer, TextLayer } from '@deck.gl/layers';
import { useDataStore } from '../../stores/dataStore';
import { useColorStore } from '../../stores/colorStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { useThemeStore } from '../../stores/themeStore';
import { useViewStore } from '../../stores/viewStore';
import { categoricalColor } from '../../lib/colorScales';
import { mapBackground, senescenceColor, textLabelTheme } from '../../lib/colors';
import { Tooltip } from '../common/Tooltip';
import type { HexbinBin } from '../../types/data';

const VIEW = new OrthographicView({ id: 'level1-ortho', flipY: false });

function buildHexagon(x: number, y: number, radius: number): [number, number][] {
  return new Array(6).fill(null).map((_, index) => {
    const angle = (Math.PI / 3) * index;
    return [x + radius * Math.cos(angle), y + radius * Math.sin(angle)];
  });
}

export function HexbinMap() {
  const hexbin = useDataStore((s) => s.hexbin);
  const centroids = useDataStore((s) => s.centroids);
  const schema = useDataStore((s) => s.schema);
  const colorMode = useColorStore((s) => s.colorMode);
  const viewState = useViewStore((s) => s.viewState);
  const setViewState = useViewStore((s) => s.setViewState);
  const drillDown = useNavigationStore((s) => s.drillDown);
  const theme = useThemeStore((s) => s.theme);
  const [hovered, setHovered] = useState<{ x: number; y: number; bin: HexbinBin } | null>(null);
  const labelTheme = textLabelTheme(theme);

  const bins = hexbin?.bins ?? [];
  const cellTypeNames = hexbin?.celltype_names ?? schema?.columns.find((column) => column.name === 'CellType')?.categories ?? [];

  const layers = useMemo(() => {
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
          drillDown({ level: 2, cellType: info.object.label });
        },
        onHover: (info: PickingInfo<(typeof polygonData)[number]>) => {
          if (!info.object || info.x === undefined || info.y === undefined) {
            setHovered(null);
            return;
          }
          setHovered({ x: info.x, y: info.y, bin: info.object });
        },
      }),
      new TextLayer({
        id: 'level1-centroids',
        data: centroids,
        pickable: true,
        getPosition: (d) => [d.x, d.y],
        getText: (d) => d.name,
        getSize: 14,
        getColor: labelTheme.text,
        fontWeight: 700,
        outlineColor: labelTheme.outline,
        outlineWidth: 3,
        onClick: (info: PickingInfo<(typeof centroids)[number]>) => {
          if (!info.object) return;
          drillDown({ level: 2, cellType: info.object.name });
        },
      }),
    ];
  }, [bins, cellTypeNames, centroids, colorMode, drillDown, hexbin?.radius, labelTheme.outline, labelTheme.text, theme]);

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
        {bins.length.toLocaleString()} hexbins • click a region to drill down
      </div>
      {hovered && (
        <Tooltip x={hovered.x} y={hovered.y}>
          <div className="font-medium text-[var(--text)]">{cellTypeNames[hovered.bin.dominant_celltype] ?? 'Unknown'}</div>
          <div className="mt-1 text-[var(--text-muted)]">{hovered.bin.count.toLocaleString()} cells</div>
          <div className="text-[var(--text-muted)]">senescence {hovered.bin.senescence_mean.toFixed(3)}</div>
        </Tooltip>
      )}
    </div>
  );
}
