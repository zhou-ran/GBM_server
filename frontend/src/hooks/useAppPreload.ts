import { useEffect } from 'react';
import { useDataStore } from '../stores/dataStore';

export function useAppPreload() {
  const loadLevel1 = useDataStore((s) => s.loadLevel1);
  const isLevel1Loaded = useDataStore((s) => s.isLevel1Loaded);

  useEffect(() => {
    if (isLevel1Loaded) {
      return;
    }

    void loadLevel1().catch((error) => {
      console.error('App preload failed:', error);
    });
  }, [isLevel1Loaded, loadLevel1]);
}
