/** useDeckLayers — computes deck.gl layers from store state */

import { useMemo } from 'react';
import type { PickingInfo } from '@deck.gl/core';
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { useDataStore } from '../stores/dataStore';
import { useFilterStore } from '../stores/filterStore';
import { useColorStore } from '../stores/colorStore';
import { useThemeStore } from '../stores/themeStore';
import { useViewStore } from '../stores/viewStore';
import { CELLTYPE_COLORS, senescenceColor, textLabelTheme } from '../lib/colors';
import { DETAIL_THRESHOLD } from '../lib/constants';
import type { Layer } from '@deck.gl/core';
import { ageGroupColor, categoricalColor, idhColor } from '../lib/colorScales';

interface UseDeckLayersOptions {
  onCellClick?: (cellId: number) => void;
  onCellHover?: (cell: { index: number; x: number; y: number } | null) => void;
}

export function useDeckLayers({ onCellClick, onCellHover }: UseDeckLayersOptions = {}): Layer[] {
  const coords = useDataStore((s) => s.coords);
  const senescence = useDataStore((s) => s.senescence);
  const cellTypeCodes = useDataStore((s) => s.cellTypeCodes);
  const cellType2Codes = useDataStore((s) => s.cellType2Codes);
  const ageCodes = useDataStore((s) => s.ageCodes);
  const idhCodes = useDataStore((s) => s.idhCodes);
  const centroids = useDataStore((s) => s.centroids);
  const schema = useDataStore((s) => s.schema);
  const filterMask = useFilterStore((s) => s.filterMask);
  const colorMode = useColorStore((s) => s.colorMode);
  const geneExpr = useColorStore((s) => s.geneExpr);
  const signatureScore = useColorStore((s) => s.signatureScore);
  const renderMode = useViewStore((s) => s.renderMode);
  const theme = useThemeStore((s) => s.theme);

  return useMemo(() => {
    if (!coords || !filterMask || !senescence || !cellTypeCodes) return [];
    const labelTheme = textLabelTheme(theme);

    const layers: Layer[] = [];
    const n = coords.length / 2;

    // Build filtered data array
    const positions: { index: number; position: [number, number] }[] = [];
    for (let i = 0; i < n; i++) {
      if (filterMask[i]) {
        positions.push({
          index: i,
          position: [coords[i * 2], coords[i * 2 + 1]],
        });
      }
    }

    if (renderMode === 'detail' || positions.length < DETAIL_THRESHOLD) {
      // ScatterplotLayer — individual cells
      layers.push(
        new ScatterplotLayer({
          id: 'scatter',
          data: positions,
          getPosition: (d: (typeof positions)[0]) => d.position,
          getRadius: 0.02,
          radiusMinPixels: 1,
          radiusMaxPixels: 4,
          getFillColor: (d: (typeof positions)[0]) => {
            if (colorMode === 'gene' && geneExpr) {
              return senescenceColor(geneExpr[d.index]);
            }
            if (colorMode === 'signature' && signatureScore) {
              return senescenceColor(signatureScore[d.index]);
            }
            if (colorMode === 'senescence') {
              return senescenceColor(senescence[d.index]);
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

            const code = cellTypeCodes[d.index];
            return CELLTYPE_COLORS[code] ?? [128, 128, 128, 200];
          },
          pickable: true,
          onClick: (info: PickingInfo<(typeof positions)[0]>) => {
            if (info.object) {
              onCellClick?.(info.object.index);
            }
          },
          onHover: (info: PickingInfo<(typeof positions)[0]>) => {
            if (!info.object || info.x === undefined || info.y === undefined) {
              onCellHover?.(null);
              return;
            }
            onCellHover?.({
              index: info.object.index,
              x: info.x,
              y: info.y,
            });
          },
          updateTriggers: {
            getFillColor: [colorMode, geneExpr],
          },
        }),
      );
    } else {
      // HeatmapLayer — density view
      layers.push(
        new HeatmapLayer({
          id: 'heatmap',
          data: positions,
          getPosition: (d: (typeof positions)[0]) => d.position,
          getWeight: (d: (typeof positions)[0]) => {
            if (colorMode === 'gene' && geneExpr) return geneExpr[d.index];
            if (colorMode === 'signature' && signatureScore) return signatureScore[d.index];
            if (colorMode === 'age' && ageCodes) return ageCodes[d.index] + 1;
            if (colorMode === 'idh' && idhCodes) return idhCodes[d.index] + 1;
            return senescence[d.index];
          },
          radiusPixels: 20,
          intensity: 1,
          threshold: 0.05,
          colorRange: [
            [0, 0, 128],
            [0, 128, 255],
            [0, 255, 128],
            [255, 255, 0],
            [255, 128, 0],
            [255, 0, 0],
          ],
          updateTriggers: {
            getWeight: [colorMode, geneExpr],
          },
        }),
      );
    }

    // Centroid labels (always visible)
    if (centroids.length > 0) {
      const centroidLabel = schema?.columns.find((column) => column.name === 'CellType')?.categories ?? [];
      layers.push(
        new TextLayer({
          id: 'centroids',
          data: centroids,
          getPosition: (d) => [d.x, d.y],
          getText: (d) => centroidLabel.includes(d.name) ? d.name : d.name,
          getSize: 12,
          getColor: labelTheme.text,
          outlineWidth: 2,
          outlineColor: labelTheme.outline,
          fontFamily: 'sans-serif',
          billboard: false,
        }),
      );
    }

    return layers;
  }, [ageCodes, cellType2Codes, cellTypeCodes, centroids, colorMode, coords, filterMask, geneExpr, idhCodes, onCellClick, onCellHover, renderMode, schema, senescence, signatureScore, theme]);
}
