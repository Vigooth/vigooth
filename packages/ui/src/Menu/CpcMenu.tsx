import { Menu } from '@base-ui/react/menu'
import type { ReactNode } from 'react'
import { css } from '@emotion/react'
import tw from 'twin.macro'

interface CpcMenuProps {
  trigger: ReactNode
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
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

const popupStyles = tw`
  bg-cpc-grey-900 border-2 border-cpc-green-500
  p-1 min-w-[180px] z-50
  outline-none
`

const itemStyles = css`
  ${tw`px-3 py-1.5 text-cpc-green-500 text-sm cursor-pointer outline-none select-none`}

  &[data-highlighted] {
    ${tw`bg-cpc-green-500 text-cpc-grey-900`}
  }
`

const itemDangerStyles = css`
  ${tw`px-3 py-1.5 text-cpc-red-500 text-sm cursor-pointer outline-none select-none`}

  &[data-highlighted] {
    ${tw`bg-cpc-red-500 text-cpc-grey-900`}
  }
`

const itemDisabledStyles = tw`opacity-40 cursor-not-allowed`

const submenuTriggerStyles = css`
  ${tw`flex items-center w-full px-3 py-1.5 text-cpc-green-500 text-sm cursor-pointer outline-none select-none`}

  &[data-highlighted] {
    ${tw`bg-cpc-green-500 text-cpc-grey-900`}
  }
`

const separatorStyles = tw`my-1 border-t border-cpc-green-500/40`

const groupLabelStyles = tw`
  px-3 py-1 text-cpc-green-500/60 text-xs uppercase tracking-wider
`

export function CpcMenu({
  trigger,
  children,
  open,
  onOpenChange,
  side = 'bottom',
  align = 'start',
}: CpcMenuProps) {
  return (
    <Menu.Root open={open} onOpenChange={onOpenChange}>
      <Menu.Trigger render={<div tw="w-full" />}>{trigger}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side={side} align={align} sideOffset={4}>
          <Menu.Popup css={popupStyles}>{children}</Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

export function CpcMenuItem({ children, onClick, disabled, variant = 'default' }: CpcMenuItemProps) {
  return (
    <Menu.Item
      css={[variant === 'danger' ? itemDangerStyles : itemStyles, disabled && itemDisabledStyles]}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Menu.Item>
  )
}

export function CpcMenuSeparator() {
  return <Menu.Separator css={separatorStyles} />
}

export function CpcMenuGroup({ label, children }: CpcMenuGroupProps) {
  return (
    <Menu.Group>
      {label && <Menu.GroupLabel css={groupLabelStyles}>{label}</Menu.GroupLabel>}
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
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger css={submenuTriggerStyles}>
        {label}
        <span tw="ml-auto pl-3 text-xs">▶</span>
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner side={side} align={align} sideOffset={0}>
          <Menu.Popup css={popupStyles}>{children}</Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  )
}
