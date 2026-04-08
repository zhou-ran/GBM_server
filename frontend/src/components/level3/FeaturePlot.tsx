import { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView } from '@deck.gl/core';
import { ScatterplotLayer } from '@deck.gl/layers';
import { useClusterStats } from '../../hooks/useClusterStats';
import { useColorStore } from '../../stores/colorStore';
import { useViewStore } from '../../stores/viewStore';
import { senescenceColor } from '../../lib/colors';

const VIEW = new OrthographicView({ id: 'feature-plot-ortho', flipY: false });

export function FeaturePlot() {
  const { points } = useClusterStats();
  const geneExpr = useColorStore((s) => s.geneExpr);
  const signatureScore = useColorStore((s) => s.signatureScore);
  const colorMode = useColorStore((s) => s.colorMode);
  const viewState = useViewStore((s) => s.viewState);
  const setViewState = useViewStore((s) => s.setViewState);

  const values = colorMode === 'signature' ? signatureScore : geneExpr;

  const layers = useMemo(() => {
    if (!values || points.length === 0) return [];
    return [
      new ScatterplotLayer({
        id: 'feature-plot',
        data: points,
        getPosition: (point: (typeof points)[number]) => point.position,
        getRadius: 0.03,
        radiusMinPixels: 1,
        radiusMaxPixels: 4,
        getFillColor: (point: (typeof points)[number]) => senescenceColor(values[point.index]),
      }),
    ];
  }, [points, values]);

  return (
    <div className="relative h-full rounded-2xl border border-[var(--border)] bg-black/10">
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
    </div>
  );
}
