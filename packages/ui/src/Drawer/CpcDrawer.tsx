import { Drawer } from '@base-ui/react/drawer';
import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

interface CpcDrawerProps {
  trigger?: ReactNode;
  title?: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: 'left' | 'right';
  showClose?: boolean;
  noPadding?: boolean;
}

export function CpcDrawer({
  trigger,
  title,
  children,
  open,
  onOpenChange,
  side = 'left',
  showClose = true,
  noPadding = false,
}: CpcDrawerProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Drawer.Trigger>{trigger}</Drawer.Trigger>}
      <Drawer.Portal keepMounted>
        <Drawer.Backdrop className="cpc-drawer-backdrop" />
        <Drawer.Popup
          className={cn(
            'cpc-drawer-popup',
            side === 'left' ? 'cpc-drawer-left' : 'cpc-drawer-right',
            noPadding && 'p-0',
          )}
        >
          {title && (
            <Drawer.Title className="text-cpc-green-500 text-lg font-bold mb-4 pb-2 border-b-2 border-cpc-green-500">
              {title}
            </Drawer.Title>
          )}
          <Drawer.Description className="sr-only">{title ?? 'Drawer'}</Drawer.Description>
          <div className="flex-1 overflow-y-auto">{children}</div>
          {showClose && (
            <Drawer.Close className="mt-4 border-2 border-cpc-green-500 text-cpc-green-500 px-4 py-2 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors text-sm cursor-pointer">
              CLOSE
            </Drawer.Close>
          )}
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
