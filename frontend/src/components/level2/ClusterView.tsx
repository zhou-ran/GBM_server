import { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView } from '@deck.gl/core';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { useClusterStats } from '../../hooks/useClusterStats';
import { useNavigationStore } from '../../stores/navigationStore';
import { useViewStore } from '../../stores/viewStore';
import { categoricalColor } from '../../lib/colorScales';

const VIEW = new OrthographicView({ id: 'level2-ortho', flipY: false });

export function ClusterView() {
  const { points, centroids } = useClusterStats();
  const selectedCellType = useNavigationStore((s) => s.selectedCellType);
  const drillDown = useNavigationStore((s) => s.drillDown);
  const viewState = useViewStore((s) => s.viewState);
  const setViewState = useViewStore((s) => s.setViewState);

  const layers = useMemo(() => {
    const subtypeOrder = Array.from(new Set(points.map((point) => point.subtype)));
    if (points.length === 0) return [];

    if (points.length > 50000) {
      return [
        new HeatmapLayer({
          id: 'cluster-density',
          data: points,
          getPosition: (point: (typeof points)[number]) => point.position,
          getWeight: (point: (typeof points)[number]) => point.senescence,
          radiusPixels: 18,
        }),
        new TextLayer({
          id: 'cluster-centroids',
          data: centroids,
          pickable: true,
          getPosition: (d) => [d.x, d.y],
          getText: (d) => d.label,
          getSize: 14,
          getColor: [255, 255, 255, 230],
          outlineColor: [0, 0, 0, 220],
          outlineWidth: 3,
          onClick: (info) => info.object && drillDown({ level: 3, subCluster: info.object.label, label: info.object.label }),
        }),
      ];
    }

    return [
      new ScatterplotLayer({
        id: 'cluster-points',
        data: points,
        pickable: true,
        radiusMinPixels: 1,
        radiusMaxPixels: 4,
        getRadius: 0.03,
        getPosition: (point: (typeof points)[number]) => point.position,
        getFillColor: (point: (typeof points)[number]) => categoricalColor(subtypeOrder.indexOf(point.subtype)),
      }),
      new TextLayer({
        id: 'cluster-centroids',
        data: centroids,
        pickable: true,
        getPosition: (d) => [d.x, d.y],
        getText: (d) => d.label,
        getSize: 14,
        getColor: [255, 255, 255, 235],
        outlineColor: [0, 0, 0, 220],
        outlineWidth: 3,
        onClick: (info) => info.object && drillDown({ level: 3, subCluster: info.object.label, label: info.object.label }),
      }),
    ];
  }, [centroids, drillDown, points]);

  return (
    <div className="relative flex-1">
      <DeckGL
        views={VIEW}
        controller={true}
        viewState={viewState}
        layers={layers}
        onViewStateChange={({ viewState: next }) =>
          setViewState({
            target: Array.isArray(next.target) && next.target.length === 2
              ? [next.target[0], next.target[1], 0]
              : (next.target as [number, number, number]) ?? viewState.target,
            zoom: typeof next.zoom === 'number' ? next.zoom : viewState.zoom,
          })}
      />
      <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/10 bg-[#0e1621]/90 px-3 py-1 text-xs text-[var(--text-muted)]">
        {selectedCellType ?? 'Cluster'} • {points.length.toLocaleString()} visible cells
      </div>
    </div>
  );
}
