import { Drawer } from '@base-ui/react/drawer'
import type { ReactNode } from 'react'
import { css } from '@emotion/react'
import tw from 'twin.macro'

interface CpcDrawerProps {
  trigger?: ReactNode
  title?: string
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: 'left' | 'right'
  showClose?: boolean
  noPadding?: boolean
}

const backdropStyles = css`
  ${tw`fixed inset-0 bg-black/60 z-40`}
  transition: opacity 300ms ease;

  &[data-open] {
    opacity: 1;
  }
  &[data-closed] {
    opacity: 0;
  }
`

const popupBase = css`
  ${tw`fixed top-0 bottom-0 z-50 w-[85vw] max-w-[320px] bg-cpc-grey-900 border-cpc-green-500 p-6 overflow-y-auto flex flex-col`}
  transition: transform 300ms ease;
`

const popupLeft = css`
  ${tw`left-0 border-r-4`}

  &[data-open] {
    transform: translateX(0);
  }
  &[data-closed] {
    transform: translateX(-100%);
  }
`

const popupRight = css`
  ${tw`right-0 border-l-4`}

  &[data-open] {
    transform: translateX(0);
  }
  &[data-closed] {
    transform: translateX(100%);
  }
`

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
        <Drawer.Backdrop css={backdropStyles} />
        <Drawer.Popup css={[popupBase, side === 'left' ? popupLeft : popupRight, noPadding && tw`p-0`]}>
          {title && (
            <Drawer.Title tw="text-cpc-green-500 text-lg font-bold mb-4 pb-2 border-b-2 border-cpc-green-500">
              {title}
            </Drawer.Title>
          )}
          <Drawer.Description tw="sr-only">{title ?? 'Drawer'}</Drawer.Description>
          <div tw="flex-1 overflow-y-auto">{children}</div>
          {showClose && (
            <Drawer.Close tw="mt-4 border-2 border-cpc-green-500 text-cpc-green-500 px-4 py-2 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors text-sm cursor-pointer">
              CLOSE
            </Drawer.Close>
          )}
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
