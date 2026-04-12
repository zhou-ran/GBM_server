/** UmapView — deck.gl map component */

import { useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView } from '@deck.gl/core';
import { useViewStore } from '../../stores/viewStore';
import { useThemeStore } from '../../stores/themeStore';
import { useDeckLayers } from '../../hooks/useDeckLayers';
import { mapBackground } from '../../lib/colors';

const VIEWS = new OrthographicView({ id: 'ortho', flipY: false });

interface UmapViewProps {
  onCellClick?: (cellId: number) => void;
  onCellHover?: (cell: { index: number; x: number; y: number } | null) => void;
}

export function UmapView({ onCellClick, onCellHover }: UmapViewProps) {
  const viewState = useViewStore((s) => s.viewState);
  const setViewState = useViewStore((s) => s.setViewState);
  const setRenderMode = useViewStore((s) => s.setRenderMode);
  const theme = useThemeStore((s) => s.theme);
  const layers = useDeckLayers({ onCellClick, onCellHover });

  const onViewStateChange = useCallback(
    ({ viewState: vs }: { viewState: Record<string, unknown> }) => {
      setViewState(vs as Parameters<typeof setViewState>[0]);
      const zoom = typeof vs.zoom === 'number' ? vs.zoom : viewState.zoom;
      setRenderMode(zoom >= 3 ? 'detail' : 'density');
    },
    [setRenderMode, setViewState, viewState.zoom],
  );

  return (
    <div className="flex-1 relative">
      <DeckGL
        views={VIEWS}
        viewState={viewState}
        onViewStateChange={onViewStateChange}
        layers={layers}
        controller={true}
        style={{ background: mapBackground(theme) }}
      />
    </div>
  );
}
