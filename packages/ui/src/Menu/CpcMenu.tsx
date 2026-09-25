import { Menu } from '@base-ui/react/menu';
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { ChevronRightIcon, SpinnerIcon } from '../Icons';

type CpcColor = 'green' | 'cyan' | 'red' | 'yellow' | 'magenta' | 'blue' | 'orange';

const colorMap = {
  green: { base: '#00FF00', dark: '#008000' },
  cyan: { base: '#00FFFF', dark: '#008080' },
  red: { base: '#FF0000', dark: '#800000' },
  yellow: { base: '#FFFF00', dark: '#808000' },
  magenta: { base: '#FF00FF', dark: '#800080' },
  blue: { base: '#0000FF', dark: '#000080' },
  orange: { base: '#FF8000', dark: '#804000' },
};

interface CpcMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  color?: CpcColor;
}

interface CpcMenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

interface CpcMenuGroupProps {
  label?: string;
  children: ReactNode;
}

interface CpcSubmenuProps {
  label: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Shows a spinner in place of the arrow while the content is being fetched. */
  loading?: boolean;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

const MenuColorContext = createContext<CpcColor>('green');

export function CpcMenu({
  trigger,
  children,
  open,
  onOpenChange,
  side = 'bottom',
  align = 'start',
  color = 'green',
}: CpcMenuProps) {
  const c = colorMap[color];
  const menuStyle = { '--menu-color': c.base } as React.CSSProperties;

  return (
    <MenuColorContext.Provider value={color}>
      <Menu.Root open={open} onOpenChange={onOpenChange}>
        <Menu.Trigger render={<div className="inline-flex" />}>{trigger}</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side={side} align={align} sideOffset={4}>
            <Menu.Popup className="cpc-menu-popup" style={menuStyle}>
              {children}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </MenuColorContext.Provider>
  );
}

export function CpcMenuItem({
  children,
  onClick,
  disabled,
  variant = 'default',
}: CpcMenuItemProps) {
  const color = useContext(MenuColorContext);
  const c = colorMap[color];
  const menuStyle = { '--menu-color': c.base } as React.CSSProperties;

  return (
    <Menu.Item
      className={cn(
        variant === 'danger' ? 'cpc-menu-item-danger' : 'cpc-menu-item',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
      style={variant === 'danger' ? undefined : menuStyle}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Menu.Item>
  );
}

export function CpcMenuSeparator() {
  const color = useContext(MenuColorContext);
  const c = colorMap[color];

  return (
    <Menu.Separator
      className="cpc-menu-separator"
      style={{ '--menu-color': c.base } as React.CSSProperties}
    />
  );
}

export function CpcMenuGroup({ label, children }: CpcMenuGroupProps) {
  const color = useContext(MenuColorContext);
  const c = colorMap[color];

  return (
    <Menu.Group>
      {label && (
        <Menu.GroupLabel
          className="cpc-menu-group-label"
          style={{ '--menu-color': c.base } as React.CSSProperties}
        >
          {label}
        </Menu.GroupLabel>
      )}
      {children}
    </Menu.Group>
  );
}

export function CpcSubmenu({
  label,
  children,
  open,
  onOpenChange,
  loading = false,
  side = 'right',
  align = 'start',
}: CpcSubmenuProps) {
  const color = useContext(MenuColorContext);
  const c = colorMap[color];
  const menuStyle = { '--menu-color': c.base } as React.CSSProperties;

  // While loading the submenu is held closed, so Base UI never reports it
  // closing: leaving the trigger is what cancels the pending open.
  function handlePointerLeave() {
    if (loading) onOpenChange?.(false);
  }

  return (
    <Menu.SubmenuRoot open={open} onOpenChange={onOpenChange}>
      <Menu.SubmenuTrigger
        className="cpc-menu-submenu-trigger"
        style={menuStyle}
        onPointerLeave={handlePointerLeave}
      >
        {label}
        {loading ? (
          <SpinnerIcon size="sm" className="ml-auto animate-spin" />
        ) : (
          <ChevronRightIcon size="sm" className="ml-auto" />
        )}
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner side={side} align={align} sideOffset={0}>
          <Menu.Popup className="cpc-menu-popup" style={menuStyle}>
            {children}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}
