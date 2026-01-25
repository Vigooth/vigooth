import { CpcLayout, AppMenu, Navigation } from '@vigooth/ui'
import { getAppsConfig } from '@vigooth/config'
import 'twin.macro'

export function HomePage() {
  const apps = getAppsConfig('portal')

  return (
    <CpcLayout>
      <div tw="h-full overflow-auto flex flex-col">
        <Navigation />

        <div tw="text-center py-6 border-b-2 border-cpc-green-500">
          <div tw="text-cpc-yellow-500 text-2xl font-bold">VIGOOTH SYSTEM</div>
          <div tw="text-cpc-cyan-500 text-sm mt-1">PORTAL v1.0 - Amstrad CPC 6128</div>
        </div>

        <div tw="flex-1 flex items-center justify-center">
          <AppMenu apps={apps} />
        </div>

        <div tw="text-center py-4 border-t-2 border-cpc-green-500 text-cpc-green-900 text-xs">
          Copyright 2025 - Retro Computing Experience
        </div>
      </div>
    </CpcLayout>
  )
}
