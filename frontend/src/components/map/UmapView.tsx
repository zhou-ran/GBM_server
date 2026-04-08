/** UmapView — deck.gl map component */

import { useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView } from '@deck.gl/core';
import { useViewStore } from '../../stores/viewStore';
import { useDeckLayers } from '../../hooks/useDeckLayers';

const VIEWS = new OrthographicView({ id: 'ortho', flipY: false });

export function UmapView() {
  const viewState = useViewStore((s) => s.viewState);
  const setViewState = useViewStore((s) => s.setViewState);
  const layers = useDeckLayers();

  const onViewStateChange = useCallback(
    ({ viewState: vs }: { viewState: Record<string, unknown> }) => {
      setViewState(vs as Parameters<typeof setViewState>[0]);
    },
    [setViewState],
  );

  return (
    <div className="flex-1 relative">
      <DeckGL
        views={VIEWS}
        viewState={viewState}
        onViewStateChange={onViewStateChange}
        layers={layers}
        controller={true}
      />
    </div>
  );
}
