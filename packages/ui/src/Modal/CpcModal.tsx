import { Dialog } from '@base-ui/react/dialog';
import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { CloseIcon } from '../Icons';
import { cn } from '../utils/cn';

interface CpcModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  /** Widens the panel for form-heavy content. Default is a reading width. */
  size?: 'md' | 'lg';
  /** Drop the padding when the content brings its own frame. */
  noPadding?: boolean;
  /** Let the title bar drag the panel around, like a desktop window. */
  draggable?: boolean;
  className?: string;
}

/**
 * A centred dialog in the CPC look: green border on black, backdrop behind.
 *
 * Meant for the short-lived things that would otherwise push a page around —
 * a form, a confirmation. Anything the reader needs to keep next to the page
 * belongs in `CpcDrawer` or the page itself.
 *
 * When draggable, the title bar moves the panel so it can be pushed aside to
 * read what it covers. The offset lives in CSS variables the stylesheet folds
 * into the centring transform, written straight to the DOM during a drag —
 * this runs on every pointer move, and re-rendering the whole form that often
 * would stutter. It resets each time the dialog opens, and is clamped to the
 * viewport so the panel can never be dragged out of reach.
 */
export function CpcModal({
  open,
  onOpenChange,
  title,
  children,
  size = 'md',
  noPadding = false,
  draggable = false,
  className,
}: CpcModalProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const offset = useRef({ x: 0, y: 0 });
  const drag = useRef<{ pointerId: number; fromX: number; fromY: number } | null>(null);

  /** How far the panel may travel before a corner would leave the screen. */
  const limits = useCallback(() => {
    const popup = popupRef.current;
    if (!popup) return { x: 0, y: 0 };
    return {
      x: Math.max(0, (window.innerWidth - popup.offsetWidth) / 2),
      y: Math.max(0, (window.innerHeight - popup.offsetHeight) / 2),
    };
  }, []);

  const moveTo = useCallback(
    (x: number, y: number) => {
      const popup = popupRef.current;
      if (!popup) return;
      const max = limits();
      offset.current = {
        x: Math.min(max.x, Math.max(-max.x, x)),
        y: Math.min(max.y, Math.max(-max.y, y)),
      };
      popup.style.setProperty('--cpc-modal-dx', `${offset.current.x}px`);
      popup.style.setProperty('--cpc-modal-dy', `${offset.current.y}px`);
    },
    [limits],
  );

  // Every opening starts centred: a panel left where the last edit put it is
  // disorienting, and on a smaller window it might not fit there at all.
  useEffect(() => {
    if (!open) return;
    offset.current = { x: 0, y: 0 };
    const popup = popupRef.current;
    popup?.style.removeProperty('--cpc-modal-dx');
    popup?.style.removeProperty('--cpc-modal-dy');
  }, [open]);

  // A window that shrinks under a moved panel would otherwise strand it.
  useEffect(() => {
    if (!open || !draggable) return;
    const onResize = () => moveTo(offset.current.x, offset.current.y);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open, draggable, moveTo]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // The close button sits in the same bar; clicking it is not a drag.
    if (!draggable || drag.current || (event.target as HTMLElement).closest('button')) return;
    const popup = popupRef.current;
    if (!popup) return;

    drag.current = {
      pointerId: event.pointerId,
      fromX: event.clientX - offset.current.x,
      fromY: event.clientY - offset.current.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    popup.dataset.dragging = 'true';
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    moveTo(event.clientX - current.fromX, event.clientY - current.fromY);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (popupRef.current) delete popupRef.current.dataset.dragging;
  };

  /** Double-click the bar to bring a pushed-aside panel back to the middle. */
  const handleRecentre = () => {
    if (draggable) moveTo(0, 0);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="cpc-modal-backdrop" />
        <Dialog.Popup
          ref={popupRef}
          className={cn(
            'cpc-modal-popup',
            size === 'lg' ? 'cpc-modal-lg' : 'cpc-modal-md',
            noPadding && 'p-0',
            className,
          )}
        >
          <div
            className={cn(
              'flex items-start justify-between gap-3',
              draggable && 'cpc-modal-handle',
            )}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onDoubleClick={handleRecentre}
          >
            {title ? (
              <Dialog.Title className="font-mono text-sm text-cpc-yellow-500">{title}</Dialog.Title>
            ) : (
              <span />
            )}
            <Dialog.Close
              aria-label="Fermer"
              className="shrink-0 border-2 border-cpc-green-900 p-1 text-cpc-green-500 transition-colors hover:border-cpc-red-500 hover:text-cpc-red-500"
            >
              <CloseIcon size="sm" />
            </Dialog.Close>
          </div>
          {/* The body scrolls, not the page behind it, so a long form on a
              phone stays reachable without losing the dialog's frame. */}
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
