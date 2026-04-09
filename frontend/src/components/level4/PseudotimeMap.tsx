import { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView } from '@deck.gl/core';
import { ScatterplotLayer } from '@deck.gl/layers';
import { useClusterStats } from '../../hooks/useClusterStats';
import { useThemeStore } from '../../stores/themeStore';
import { useTrajectoryStore } from '../../stores/trajectoryStore';
import { useViewStore } from '../../stores/viewStore';
import { mapBackground } from '../../lib/colors';
import { pseudotimeCss } from '../../lib/colorScales';

const VIEW = new OrthographicView({ id: 'pseudotime-ortho', flipY: false });

function pseudotimeRgba(value: number): [number, number, number, number] {
  const match = pseudotimeCss(value).match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
  return [match[0] ?? 124, match[1] ?? 58, match[2] ?? 237, Math.round((match[3] ?? 0.92) * 255)];
}

export function PseudotimeMap() {
  const { points } = useClusterStats();
  const pseudotime = useTrajectoryStore((s) => s.pseudotime);
  const viewState = useViewStore((s) => s.viewState);
  const setViewState = useViewStore((s) => s.setViewState);
  const theme = useThemeStore((s) => s.theme);

  const layers = useMemo(() => {
    if (!pseudotime) return [];
    const data = points.filter((point) => Number.isFinite(pseudotime[point.index]));
    return [
      new ScatterplotLayer({
        id: 'pseudotime-points',
        data,
        getPosition: (point: (typeof data)[number]) => point.position,
        getRadius: 0.03,
        radiusMinPixels: 1,
        radiusMaxPixels: 4,
        getFillColor: (point: (typeof data)[number]) => pseudotimeRgba(pseudotime[point.index]),
      }),
    ];
  }, [points, pseudotime]);

  return (
    <div className="relative h-full rounded-2xl border border-[var(--border)] bg-[var(--map-bg)]">
      <DeckGL
        views={VIEW}
        controller={true}
        viewState={viewState}
        layers={layers}
        style={{ background: mapBackground(theme) }}
        onViewStateChange={({ viewState: next }) =>
          setViewState({
            target: Array.isArray(next.target) && next.target.length === 2
              ? [next.target[0], next.target[1], 0]
              : (next.target as [number, number, number]) ?? viewState.target,
            zoom: typeof next.zoom === 'number' ? next.zoom : viewState.zoom,
          })}
      />
      {layers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-[var(--text-muted)]">
          No pseudotime loaded. Run trajectory preprocessing, then open Level 4 from a major cell type.
        </div>
      )}
    </div>
  );
}
