import { useEffect, useRef, useState } from 'react';
import { saveCanvas, loadCanvas } from '../services/storage';
import { pruneImages } from '../services/imageStore';
import type { CanvasState } from '../types';

export function usePersistence(
  canvasState: CanvasState,
  loadState: (data: Partial<CanvasState>) => void
) {
  const initialized = useRef(false);
  /**
   * Pruning deletes every blob the canvas does not reference, so it must never
   * run against a canvas we failed to load — that would look like "no node uses
   * anything" and wipe the user's photos.
   */
  const loadSucceeded = useRef(false);
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
        loadSucceeded.current = true;
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
      // Drop blobs whose node was deleted or whose photo was replaced. Piggybacks
      // on the debounced save so it runs once per burst of edits, not per change.
      if (loadSucceeded.current) {
        pruneImages(canvasState.nodes.map((n) => n.imageUrl || '')).catch((err: any) =>
          console.warn('Failed to prune images:', err)
        );
      }
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [canvasState.nodes, canvasState.edges, canvasState.viewport, canvasState]);

  return { hydrated };
}
