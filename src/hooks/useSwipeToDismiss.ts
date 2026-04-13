import { useRef, useCallback, useEffect } from 'react';

type Direction = 'down' | 'left';

interface SwipeOptions {
  direction: Direction;
  /** Pixels of movement required to trigger dismiss (default: 80) */
  threshold?: number;
  /** Velocity threshold in px/ms (default: 0.5) */
  velocityThreshold?: number;
  /** Max ms for the whole gesture to count (default: 600) */
  maxDuration?: number;
  /** Whether to scale down the panel during drag (default: true) */
  enableScaling?: boolean;
  onDismiss: () => void;
}

const NATIVE_EASING_DISMISS = 'cubic-bezier(0.32, 0.72, 0, 1)';
const NATIVE_EASING_SNAP = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

export function useSwipeToDismiss<T extends HTMLElement>({
  direction,
  threshold = 80,
  velocityThreshold = 0.5,
  maxDuration = 600,
  enableScaling = false,
  onDismiss,
}: SwipeOptions) {
  const ref = useRef<T>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const dragging = useRef(false);
  const overlayRef = useRef<HTMLElement | null>(null);

  // Helper to find and store the overlay parent
  const getOverlay = useCallback(() => {
    if (!ref.current) return null;
    if (overlayRef.current) return overlayRef.current;

    // Search for modern app overlay classes
    const overlay = ref.current.closest('.modal-overlay, .sidebar-overlay') as HTMLElement;
    overlayRef.current = overlay;
    return overlay;
  }, []);

  const handleStart = useCallback((x: number, y: number) => {
    startX.current = x;
    startY.current = y;
    startTime.current = Date.now();
    dragging.current = true;

    if (ref.current) {
      // IMPORTANT: Animation 'none' is required to override CSS fill-mode: both animations
      ref.current.style.animation = 'none';
      ref.current.style.transition = 'none';
      const overlay = getOverlay();
      if (overlay) {
        overlay.style.animation = 'none';
        overlay.style.transition = 'none';
      }
    }
  }, [getOverlay]);

  const handleMove = useCallback((x: number, y: number) => {
    if (!dragging.current || !ref.current) return;
    const dx = x - startX.current;
    const dy = y - startY.current;

    const delta = direction === 'down' ? dy : -dx;
    const isReverse = direction === 'down' ? dy < 0 : dx > 0;

    // Apply elastic resistance if dragging in reverse direction
    let effectiveDelta = delta;
    if (isReverse) {
      effectiveDelta = delta / 4;
    }

    // Calculate progress and scale
    const limit = direction === 'down' ? window.innerHeight : window.innerWidth;
    const progress = Math.min(Math.max(effectiveDelta / limit, 0), 1);
    const scale = enableScaling ? 1 - progress * 0.05 : 1;

    // Apply transform and scale
    const translateVal = direction === 'down'
      ? `translateY(${effectiveDelta}px)`
      : `translateX(${-effectiveDelta}px)`;

    ref.current.style.transform = `${translateVal} scale(${scale})`;

    // Update backdrop opacity proportionally
    const overlay = getOverlay();
    if (overlay) {
      overlay.style.backgroundColor = `rgba(18, 14, 22, ${0.85 * (1 - progress)})`;
      overlay.style.backdropFilter = `blur(${16 * (1 - progress)}px)`;
    }
  }, [direction, enableScaling, getOverlay]);

  const handleEnd = useCallback((x: number, y: number) => {
    if (!dragging.current || !ref.current) return;
    dragging.current = false;
    const dx = x - startX.current;
    const dy = y - startY.current;
    const elapsed = Date.now() - startTime.current;

    const delta = direction === 'down' ? dy : -dx;
    const velocity = delta / elapsed;

    const shouldDismiss = (delta >= threshold || velocity >= velocityThreshold) && elapsed <= maxDuration;

    if (shouldDismiss) {
      const translateFull = direction === 'down' ? 'translateY(100%)' : 'translateX(-100%)';
      const duration = 280;

      ref.current.style.transition = `transform ${duration}ms ${NATIVE_EASING_DISMISS}`;
      ref.current.style.transform = translateFull;

      const overlay = getOverlay();
      if (overlay) {
        overlay.style.transition = `background-color ${duration}ms linear, backdrop-filter ${duration}ms linear`;
        overlay.style.backgroundColor = 'transparent';
        overlay.style.backdropFilter = 'blur(0px)';
      }

      setTimeout(onDismiss, duration);
    } else {
      const duration = 250;
      ref.current.style.transition = `transform ${duration}ms ${NATIVE_EASING_SNAP}`;
      ref.current.style.transform = '';

      const overlay = getOverlay();
      if (overlay) {
        overlay.style.transition = `background-color ${duration}ms ${NATIVE_EASING_SNAP}, backdrop-filter ${duration}ms ${NATIVE_EASING_SNAP}`;
        overlay.style.backgroundColor = '';
        overlay.style.backdropFilter = '';
      }
    }
  }, [direction, threshold, velocityThreshold, maxDuration, onDismiss, getOverlay]);

  // Touch Handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  }, [handleStart]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  }, [handleMove]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  }, [handleEnd]);

  // Mouse Handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);

    const onMouseMove = (me: MouseEvent) => {
      handleMove(me.clientX, me.clientY);
    };

    const onMouseUp = (me: MouseEvent) => {
      handleEnd(me.clientX, me.clientY);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [handleStart, handleMove, handleEnd]);

  return {
    ref,
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onMouseDown },
  };
}
