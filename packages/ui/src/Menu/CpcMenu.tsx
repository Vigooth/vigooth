import { Menu } from '@base-ui/react/menu'
import type { ReactNode } from 'react'
import { css } from '@emotion/react'
import tw from 'twin.macro'

type CpcColor = 'green' | 'cyan' | 'red' | 'yellow' | 'magenta' | 'blue' | 'orange'

const colorMap = {
  green: { base: '#00FF00', dark: '#008000' },
  cyan: { base: '#00FFFF', dark: '#008080' },
  red: { base: '#FF0000', dark: '#800000' },
  yellow: { base: '#FFFF00', dark: '#808000' },
  magenta: { base: '#FF00FF', dark: '#800080' },
  blue: { base: '#0000FF', dark: '#000080' },
  orange: { base: '#FF8000', dark: '#804000' },
}

interface CpcMenuProps {
  trigger: ReactNode
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  color?: CpcColor
}

interface CpcMenuItemProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'danger'
}

interface CpcMenuGroupProps {
  label?: string
  children: ReactNode
}

interface CpcSubmenuProps {
  label: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
}

function getPopupStyles(color: CpcColor) {
  const c = colorMap[color]
  return css`
    ${tw`p-1 min-w-[180px] z-50 outline-none`}
    background: #0a0a0a;
    border: 2px solid ${c.base};
  `
}

function getItemStyles(color: CpcColor) {
  const c = colorMap[color]
  return css`
    ${tw`px-3 py-1.5 text-sm cursor-pointer outline-none select-none`}
    color: ${c.base};
    &[data-highlighted] {
      background: ${c.base};
      color: #0a0a0a;
    }
    &[data-highlighted] span {
      color: #0a0a0a;
    }
  `
}

function getDangerItemStyles() {
  return css`
    ${tw`px-3 py-1.5 text-sm cursor-pointer outline-none select-none`}
    color: #FF0000;
    &[data-highlighted] {
      background: #FF0000;
      color: #0a0a0a;
    }
  `
}

function getSeparatorStyles(color: CpcColor) {
  const c = colorMap[color]
  return css`
    ${tw`my-1`}
    border-top: 1px solid ${c.base}40;
  `
}

function getGroupLabelStyles(color: CpcColor) {
  const c = colorMap[color]
  return css`
    ${tw`px-3 py-1 text-xs uppercase tracking-wider`}
    color: ${c.base}99;
  `
}

function getSubmenuTriggerStyles(color: CpcColor) {
  const c = colorMap[color]
  return css`
    ${tw`flex items-center w-full px-3 py-1.5 text-sm cursor-pointer outline-none select-none`}
    color: ${c.base};
    &[data-highlighted] {
      background: ${c.base};
      color: #0a0a0a;
    }
  `
}

// Context to pass color down to children
import { createContext, useContext } from 'react'
import { ChevronRightIcon } from '../Icons'

const MenuColorContext = createContext<CpcColor>('green')

export function CpcMenu({
  trigger,
  children,
  open,
  onOpenChange,
  side = 'bottom',
  align = 'start',
  color = 'green',
}: CpcMenuProps) {
  return (
    <MenuColorContext.Provider value={color}>
      <Menu.Root open={open} onOpenChange={onOpenChange}>
        <Menu.Trigger render={<div tw="inline-flex" />}>{trigger}</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side={side} align={align} sideOffset={4}>
            <Menu.Popup css={getPopupStyles(color)}>{children}</Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </MenuColorContext.Provider>
  )
}

export function CpcMenuItem({ children, onClick, disabled, variant = 'default' }: CpcMenuItemProps) {
  const color = useContext(MenuColorContext)
  const styles = variant === 'danger' ? getDangerItemStyles() : getItemStyles(color)
  const disabledStyles = disabled ? tw`opacity-40 cursor-not-allowed` : undefined

  return (
    <Menu.Item
      css={[styles, disabledStyles]}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Menu.Item>
  )
}

export function CpcMenuSeparator() {
  const color = useContext(MenuColorContext)
  return <Menu.Separator css={getSeparatorStyles(color)} />
}

export function CpcMenuGroup({ label, children }: CpcMenuGroupProps) {
  const color = useContext(MenuColorContext)
  return (
    <Menu.Group>
      {label && <Menu.GroupLabel css={getGroupLabelStyles(color)}>{label}</Menu.GroupLabel>}
      {children}
    </Menu.Group>
  )
}

export function CpcSubmenu({
  label,
  children,
  side = 'right',
  align = 'start',
}: CpcSubmenuProps) {
  const color = useContext(MenuColorContext)
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger css={getSubmenuTriggerStyles(color)}>
        {label}
        <ChevronRightIcon size="sm" tw="ml-auto" />
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner side={side} align={align} sideOffset={0}>
          <Menu.Popup css={getPopupStyles(color)}>{children}</Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  )
}
