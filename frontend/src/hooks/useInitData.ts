import { useEffect } from 'react';
import { useDataStore } from '../stores/dataStore';
import { useFilterStore } from '../stores/filterStore';
import { useUIStore } from '../stores/uiStore';
import { useViewStore } from '../stores/viewStore';

function centerViewOnBounds() {
  const { schema } = useDataStore.getState();
  if (!schema?.umap_bounds) {
    return;
  }

  const { xmin, xmax, ymin, ymax } = schema.umap_bounds;
  useViewStore.getState().setViewState({
    target: [(xmin + xmax) / 2, (ymin + ymax) / 2, 0],
  });
}

export function useInitDashboardData() {
  const loadLevel1 = useDataStore((s) => s.loadLevel1);
  const isLevel1Loaded = useDataStore((s) => s.isLevel1Loaded);
  const setLevelLoading = useUIStore((s) => s.setLevelLoading);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (isLevel1Loaded) {
        centerViewOnBounds();
        setLevelLoading(1, false);
        return;
      }

      setLevelLoading(1, true, 'Loading atlas overview...');
      try {
        await loadLevel1((message) => {
          if (!cancelled) {
            setLevelLoading(1, true, message);
          }
        });

        if (cancelled) {
          return;
        }

        centerViewOnBounds();
        setLevelLoading(1, false);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        setLevelLoading(1, true, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [isLevel1Loaded, loadLevel1, setLevelLoading]);
}

export function useInitExplorerData() {
  const loadLevel1 = useDataStore((s) => s.loadLevel1);
  const loadLevel2 = useDataStore((s) => s.loadLevel2);
  const isLevel1Loaded = useDataStore((s) => s.isLevel1Loaded);
  const isLevel2Loaded = useDataStore((s) => s.isLevel2Loaded);
  const filterMask = useFilterStore((s) => s.filterMask);
  const initFilters = useFilterStore((s) => s.initFilters);
  const setLevelLoading = useUIStore((s) => s.setLevelLoading);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLevelLoading(2, true, 'Loading explorer...');

      try {
        if (isLevel1Loaded && isLevel2Loaded) {
          centerViewOnBounds();
          setLevelLoading(1, false);
          setLevelLoading(2, false);
          return;
        }

        if (!isLevel1Loaded) {
          await loadLevel1((message) => {
            if (!cancelled) {
              setLevelLoading(1, true, message);
            }
          });
        }

        if (!isLevel2Loaded) {
          await loadLevel2((message) => {
            if (!cancelled) {
              setLevelLoading(2, true, message);
            }
          });
        }

        if (cancelled) {
          return;
        }

        const {
          schema,
          cellTypeCodes,
          cellType2Codes,
          idhCodes,
          stageCodes,
          ageCodes,
          sexCodes,
          donorCodes,
        } = useDataStore.getState();

        if (
          schema &&
          cellTypeCodes &&
          cellType2Codes &&
          idhCodes &&
          stageCodes &&
          ageCodes &&
          sexCodes &&
          donorCodes &&
          !filterMask
        ) {
          initFilters(schema, {
            CellType: cellTypeCodes,
            CellType_Level2: cellType2Codes,
            IDH: idhCodes,
            stage: stageCodes,
            age_Group5565: ageCodes,
            sex: sexCodes,
            donor_id: donorCodes as unknown as Uint8Array,
          });
        }

        centerViewOnBounds();
        setLevelLoading(1, false);
        setLevelLoading(2, false);
      } catch (error) {
        console.error('Failed to load explorer data:', error);
        setLevelLoading(2, true, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [filterMask, initFilters, isLevel1Loaded, isLevel2Loaded, loadLevel1, loadLevel2, setLevelLoading]);
}
