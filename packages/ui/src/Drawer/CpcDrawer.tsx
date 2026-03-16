import { Drawer } from '@base-ui/react/drawer'
import type { ReactNode } from 'react'
import tw from 'twin.macro'

interface CpcDrawerProps {
  trigger: ReactNode
  title?: string
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: 'left' | 'right'
}

const backdropStyles = tw`fixed inset-0 bg-black/60 z-40`

const popupBase = tw`
  fixed top-0 bottom-0 z-50
  w-[320px] max-w-[85vw]
  bg-cpc-grey-900 border-cpc-green-500
  p-6 overflow-y-auto
  flex flex-col
`

const popupLeft = tw`left-0 border-r-4`
const popupRight = tw`right-0 border-l-4`

export function CpcDrawer({
  trigger,
  title,
  children,
  open,
  onOpenChange,
  side = 'left',
}: CpcDrawerProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Trigger>{trigger}</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop css={backdropStyles} />
        <Drawer.Popup css={[popupBase, side === 'left' ? popupLeft : popupRight]}>
          {title && (
            <Drawer.Title tw="text-cpc-green-500 text-lg font-bold mb-4 pb-2 border-b-2 border-cpc-green-500">
              {title}
            </Drawer.Title>
          )}
          <Drawer.Description tw="sr-only">{title ?? 'Drawer'}</Drawer.Description>
          <div tw="flex-1">{children}</div>
          <Drawer.Close tw="mt-4 border-2 border-cpc-green-500 text-cpc-green-500 px-4 py-2 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors text-sm cursor-pointer">
            CLOSE
          </Drawer.Close>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
