import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/**
 * Make an element draggable by a handle, like a desktop window.
 *
 * The offset is written to the element as the CSS variables `--drag-x` and
 * `--drag-y`, which the stylesheet folds into whatever transform already
 * positions it — so dragging never fights a `translate` that centres it:
 *
 *     transform: translate(calc(-50% + var(--drag-x, 0px)), ...);
 *
 * It is written straight to the DOM rather than held in state: a pointer move
 * fires dozens of times a second, and re-rendering the dragged subtree that
 * often stutters. While a drag is in progress the element carries a
 * `data-dragging` attribute, for dropping any transition that would otherwise
 * make it lag behind the pointer.
 *
 * Movement is clamped so the element always stays fully inside the viewport,
 * and re-clamped when the window resizes, so it can never be pushed out of
 * reach and stranded there.
 */
export interface UseDraggableOptions {
  /** When false the handlers do nothing, so a component can offer this as a prop. */
  enabled?: boolean;
  /**
   * Return to the origin whenever this value changes. Pass whatever marks a
   * fresh start — a dialog's `open`, the id of the thing being shown.
   */
  resetOn?: unknown;
}

/** Spread onto the element that should start a drag. */
export interface DraggableHandleProps {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
  onDoubleClick: () => void;
}

export interface UseDraggableResult<T extends HTMLElement> {
  /** Attach to the element that moves. */
  ref: React.RefObject<T | null>;
  handleProps: DraggableHandleProps;
  /** Put it back where it started. Also bound to a double-click on the handle. */
  recentre: () => void;
}

/** Where the element sits with no offset applied, and how big it is. */
interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function useDraggable<T extends HTMLElement>({
  enabled = true,
  resetOn,
}: UseDraggableOptions = {}): UseDraggableResult<T> {
  const ref = useRef<T>(null);
  const offset = useRef({ x: 0, y: 0 });
  const drag = useRef<{ pointerId: number; fromX: number; fromY: number; bounds: Bounds } | null>(
    null,
  );

  const measure = useCallback((): Bounds | null => {
    const element = ref.current;
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    // Subtracting the live offset gives the untranslated position, which is
    // what the clamp below is expressed against.
    return {
      left: rect.left - offset.current.x,
      top: rect.top - offset.current.y,
      width: rect.width,
      height: rect.height,
    };
  }, []);

  const applyOffset = useCallback((x: number, y: number, bounds: Bounds | null) => {
    const element = ref.current;
    if (!element) return;

    let nextX = x;
    let nextY = y;
    if (bounds) {
      const minX = -bounds.left;
      const maxX = window.innerWidth - bounds.width - bounds.left;
      const minY = -bounds.top;
      const maxY = window.innerHeight - bounds.height - bounds.top;
      // An element larger than the viewport has an empty range; pinning it to
      // the low edge keeps its top-left corner reachable.
      nextX = maxX < minX ? minX : Math.min(maxX, Math.max(minX, x));
      nextY = maxY < minY ? minY : Math.min(maxY, Math.max(minY, y));
    }

    offset.current = { x: nextX, y: nextY };
    element.style.setProperty('--drag-x', `${nextX}px`);
    element.style.setProperty('--drag-y', `${nextY}px`);
  }, []);

  const recentre = useCallback(() => {
    if (!enabled) return;
    const element = ref.current;
    offset.current = { x: 0, y: 0 };
    element?.style.removeProperty('--drag-x');
    element?.style.removeProperty('--drag-y');
  }, [enabled]);

  // A fresh start is a centred start: leaving the element where the last
  // interaction dropped it is disorienting, and a smaller window may no
  // longer have room for it there.
  useEffect(() => {
    offset.current = { x: 0, y: 0 };
    const element = ref.current;
    element?.style.removeProperty('--drag-x');
    element?.style.removeProperty('--drag-y');
  }, [resetOn]);

  useEffect(() => {
    if (!enabled) return;
    const onResize = () => applyOffset(offset.current.x, offset.current.y, measure());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [enabled, applyOffset, measure]);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    // A handle usually shares its bar with buttons; pressing one is not a drag.
    if (!enabled || drag.current || (event.target as HTMLElement).closest('button')) return;
    const bounds = measure();
    if (!bounds) return;

    drag.current = {
      pointerId: event.pointerId,
      fromX: event.clientX - offset.current.x,
      fromY: event.clientY - offset.current.y,
      bounds,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (ref.current) ref.current.dataset.dragging = 'true';
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    applyOffset(event.clientX - current.fromX, event.clientY - current.fromY, current.bounds);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (ref.current) delete ref.current.dataset.dragging;
  };

  return {
    ref,
    recentre,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onDoubleClick: recentre,
    },
  };
}
