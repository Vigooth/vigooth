import { ReactNode } from 'react'
import tw from 'twin.macro'
import { cpcScreen, cpcTextShadow } from '@vigooth/styles'

interface CpcLayoutProps {
  children: ReactNode
}

export function CpcLayout({ children }: CpcLayoutProps) {
  return (
    <div css={[tw`h-full w-full bg-cpc-grey-900 box-border overflow-hidden text-cpc-green-500 font-cpc border-2 border-amber-400`, cpcScreen]}>
      <div css={[tw`border-4 border-cpc-blue-900 h-full w-full`, cpcTextShadow]}>
        {children}
      </div>
    </div>
  )
}
