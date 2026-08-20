import { useEffect, useRef, useState } from 'react';
import { saveCanvas, loadCanvas } from '../services/storage';
import type { CanvasState } from '../types';

export function usePersistence(
  canvasState: CanvasState,
  loadState: (data: Partial<CanvasState>) => void
) {
  const initialized = useRef(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  // Exposed so device sync can wait for the local canvas before comparing
  // against the server, instead of racing an empty state onto it.
  const [hydrated, setHydrated] = useState(false);

  // Load on mount
  useEffect(() => {
    loadCanvas()
      .then((data: any) => {
        if (data && (data.nodes?.length || data.edges?.length)) {
          loadState(data);
        }
        initialized.current = true;
        setHydrated(true);
      })
      .catch((err: any) => {
        console.warn('Failed to load canvas:', err);
        initialized.current = true;
        setHydrated(true);
      });
  }, [loadState]);

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (!initialized.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveCanvas(canvasState).catch((err: any) => console.warn('Failed to save canvas:', err));
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [canvasState.nodes, canvasState.edges, canvasState.viewport, canvasState]);

  return { hydrated };
}
