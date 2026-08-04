import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  initial: number;
  min: number;
  max: number;
  /** 'left' = handle on right edge (resizes content on the left). 'right' = handle on left edge. */
  side: 'left' | 'right';
}

export interface ResizeBinding {
  width: number;
  onPointerDown: (e: React.PointerEvent) => void;
}

/**
 * Returns a width + a pointer handler to attach to a draggable handle element.
 * The container should apply `style={{ width }}`. The handle is just a thin div
 * absolutely positioned on the appropriate edge.
 */
export function useHorizontalResize({ initial, min, max, side }: Options): ResizeBinding {
  const [width, setWidth] = useState(initial);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      startXRef.current = e.clientX;
      startWidthRef.current = width;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - startXRef.current;
      const delta = side === 'left' ? dx : -dx;
      const next = Math.min(max, Math.max(min, startWidthRef.current + delta));
      setWidth(next);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, [side, min, max]);

  return { width, onPointerDown };
}
