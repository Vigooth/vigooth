import { Dialog } from '@base-ui/react/dialog';
import type { ReactNode } from 'react';
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
  className?: string;
}

/**
 * A centred dialog in the CPC look: green border on black, backdrop behind.
 *
 * Meant for the short-lived things that would otherwise push a page around —
 * a form, a confirmation. Anything the reader needs to keep next to the page
 * belongs in `CpcDrawer` or the page itself.
 */
export function CpcModal({
  open,
  onOpenChange,
  title,
  children,
  size = 'md',
  noPadding = false,
  className,
}: CpcModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="cpc-modal-backdrop" />
        <Dialog.Popup
          className={cn(
            'cpc-modal-popup',
            size === 'lg' ? 'cpc-modal-lg' : 'cpc-modal-md',
            noPadding && 'p-0',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3">
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
