/** useInitData — orchestrates initial data loading */

import { useEffect } from 'react';
import { useDataStore } from '../stores/dataStore';
import { useFilterStore } from '../stores/filterStore';
import { useViewStore } from '../stores/viewStore';
import { useUIStore } from '../stores/uiStore';
import { useNavigationStore } from '../stores/navigationStore';

export function useLevel1Data() {
  const loadLevel1 = useDataStore((s) => s.loadLevel1);
  const initFilters = useFilterStore((s) => s.initFilters);
  const setViewState = useViewStore((s) => s.setViewState);
  const setLevelLoading = useUIStore((s) => s.setLevelLoading);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLevelLoading(1, true, 'Loading atlas overview...');
      try {
        await loadLevel1((msg) => {
          if (!cancelled) setLevelLoading(1, true, msg);
        });

        if (cancelled) return;

        const { schema } = useDataStore.getState();
        if (schema) {
          initFilters(schema, {});
        }

        if (schema?.umap_bounds) {
          const b = schema.umap_bounds;
          const cx = (b.xmin + b.xmax) / 2;
          const cy = (b.ymin + b.ymax) / 2;
          setViewState({ target: [cx, cy, 0] });
        }

        setLevelLoading(1, false);
      } catch (err) {
        console.error('Failed to load data:', err);
        setLevelLoading(1, true, `Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useLevel2Data() {
  const currentLevel = useNavigationStore((s) => s.currentLevel);
  const loadLevel2 = useDataStore((s) => s.loadLevel2);
  const isLevel2Loaded = useDataStore((s) => s.isLevel2Loaded);
  const initFilters = useFilterStore((s) => s.initFilters);
  const setLevelLoading = useUIStore((s) => s.setLevelLoading);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (currentLevel < 2 || isLevel2Loaded) return;

      setLevelLoading(2, true, 'Loading cell-level atlas...');
      try {
        await loadLevel2((msg) => {
          if (!cancelled) setLevelLoading(2, true, msg);
        });

        if (cancelled) return;

        const { schema, cellTypeCodes, cellType2Codes, idhCodes, stageCodes, ageCodes, sexCodes, donorCodes } =
          useDataStore.getState();

        if (schema && cellTypeCodes && cellType2Codes && idhCodes && stageCodes && ageCodes && sexCodes && donorCodes) {
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

        setLevelLoading(2, false);
      } catch (err) {
        console.error('Failed to load level 2 data:', err);
        setLevelLoading(2, true, `Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [currentLevel, initFilters, isLevel2Loaded, loadLevel2, setLevelLoading]);
}

export function useInitData() {
  useLevel1Data();
  useLevel2Data();
}
