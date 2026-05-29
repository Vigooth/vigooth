import { useEffect, useRef } from 'react';
import { cn } from '@vigooth/ui';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-black border border-cpc-green-500 min-w-40 py-1 font-mono shadow-xl"
      style={{ left: x, top: y }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          disabled={item.disabled}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={cn(
            'block w-full text-left px-3 py-1 text-xs transition-colors',
            item.disabled
              ? 'text-cpc-green-900 cursor-not-allowed'
              : item.danger
                ? 'text-cpc-red-500 hover:bg-cpc-red-500 hover:text-black'
                : 'text-cpc-green-500 hover:bg-cpc-green-500 hover:text-black',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
