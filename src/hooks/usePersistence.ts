import { useEffect, useRef } from 'react';
import { saveCanvas, loadCanvas } from '../services/storage';
import type { CanvasState } from '../types';

export function usePersistence(
  canvasState: CanvasState,
  loadState: (data: Partial<CanvasState>) => void
) {
  const initialized = useRef(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // Load on mount
  useEffect(() => {
    loadCanvas()
      .then((data: any) => {
        if (data && (data.nodes?.length || data.edges?.length)) {
          loadState(data);
        }
        initialized.current = true;
      })
      .catch((err: any) => {
        console.warn('Failed to load canvas:', err);
        initialized.current = true;
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
}
