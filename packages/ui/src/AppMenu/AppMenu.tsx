import tw from 'twin.macro'
import { animatePulse } from '@vigooth/styles'

export interface AppConfig {
  id: string
  name: string
  description: string
  icon: string
  url: string
  color: 'green' | 'red' | 'cyan' | 'yellow' | 'magenta'
}

interface AppMenuProps {
  apps: AppConfig[]
  currentAppId?: string
  portalUrl?: string
}

const colorStyles = {
  green: tw`border-cpc-green-500 text-cpc-green-500 hover:bg-cpc-green-500 hover:text-cpc-grey-900`,
  red: tw`border-cpc-red-500 text-cpc-red-500 hover:bg-cpc-red-500 hover:text-cpc-grey-900`,
  cyan: tw`border-cpc-cyan-500 text-cpc-cyan-500 hover:bg-cpc-cyan-500 hover:text-cpc-grey-900`,
  yellow: tw`border-cpc-yellow-500 text-cpc-yellow-500 hover:bg-cpc-yellow-500 hover:text-cpc-grey-900`,
  magenta: tw`border-cpc-magenta-500 text-cpc-magenta-500 hover:bg-cpc-magenta-500 hover:text-cpc-grey-900`,
}

export function AppMenu({ apps, currentAppId, portalUrl }: AppMenuProps) {
  return (
    <div tw="p-4">
      {currentAppId && portalUrl && (
        <a
          href={portalUrl}
          tw="inline-block mb-6 border-2 border-cpc-green-500 text-cpc-green-500 px-4 py-2 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors text-sm"
        >
          &lt; BACK TO PORTAL
        </a>
      )}

      <div tw="text-cpc-yellow-500 text-xl mb-6">
        {currentAppId ? 'OTHER APPLICATIONS' : 'SELECT APPLICATION'}
      </div>

      <div tw="grid grid-cols-1 md:grid-cols-2 gap-4">
        {apps
          .filter((app) => app.id !== currentAppId)
          .map((app) => (
            <a
              key={app.id}
              href={app.url}
              css={[
                tw`block border-4 p-4 transition-all hover:scale-105`,
                colorStyles[app.color],
              ]}
            >
              <div tw="flex items-center gap-3 mb-2">
                <span tw="text-2xl">{app.icon}</span>
                <span tw="text-lg font-bold">{app.name}</span>
              </div>
              <div tw="text-sm opacity-80">{app.description}</div>
            </a>
          ))}
      </div>

      {!currentAppId && (
        <div css={[tw`text-cpc-cyan-500 text-xs mt-8 text-center`, animatePulse]}>
          SELECT AN APPLICATION TO CONTINUE
        </div>
      )}
    </div>
  )
}
