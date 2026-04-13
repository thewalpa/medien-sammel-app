import { useRef, useCallback } from 'react';

type Direction = 'down' | 'left';

interface SwipeOptions {
  direction: Direction;
  /** Pixels of movement required to trigger dismiss (default: 80) */
  threshold?: number;
  /** Max ms for the whole gesture to count (default: 600) */
  maxDuration?: number;
  onDismiss: () => void;
}

/**
 * Returns ref + touch handlers that dismiss the element when the user
 * swipes in the given direction far enough and fast enough.
 *
 * Attach `ref` to the panel/sheet element and spread `handlers` onto it.
 */
export function useSwipeToDismiss<T extends HTMLElement>({
  direction,
  threshold = 80,
  maxDuration = 600,
  onDismiss,
}: SwipeOptions) {
  const ref = useRef<T>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const dragging = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    startTime.current = Date.now();
    dragging.current = true;
    if (ref.current) {
      ref.current.style.transition = 'none';
    }
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging.current || !ref.current) return;
      const t = e.touches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;

      if (direction === 'down') {
        if (dy < 0) return; // don't allow upward drag
        ref.current.style.transform = `translateY(${dy}px)`;
      } else {
        // left
        if (dx > 0) return; // don't allow rightward drag
        ref.current.style.transform = `translateX(${dx}px)`;
      }
    },
    [direction]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging.current || !ref.current) return;
      dragging.current = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;
      const elapsed = Date.now() - startTime.current;

      const delta = direction === 'down' ? dy : -dx;
      const shouldDismiss = delta >= threshold && elapsed <= maxDuration;

      if (shouldDismiss) {
        // Animate fully off-screen then call onDismiss
        const translateVal =
          direction === 'down' ? 'translateY(100%)' : 'translateX(-100%)';
        ref.current.style.transition = 'transform 220ms ease';
        ref.current.style.transform = translateVal;
        setTimeout(onDismiss, 220);
      } else {
        // Snap back
        ref.current.style.transition = 'transform 220ms ease';
        ref.current.style.transform = '';
      }
    },
    [direction, threshold, maxDuration, onDismiss]
  );

  return {
    ref,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
