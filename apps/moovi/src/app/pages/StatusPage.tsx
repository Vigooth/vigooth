import tw from 'twin.macro'
import { Header } from '@/components/layout/Header'
import { CpcButton } from '@vigooth/ui'
import { useServiceHealth } from '@/hooks/useServiceHealth'
import type { ServiceStatus } from '@/lib/api/health'

function ServiceRow({ service }: { service: ServiceStatus }) {
  const isOk = service.status === 'ok'

  return (
    <div tw="flex items-center justify-between border-2 border-cpc-green-900 px-4 py-3">
      <span tw="text-cpc-cyan-500 text-sm font-bold">{service.name}</span>
      <div tw="flex items-center gap-4">
        <span tw="text-cpc-green-900 text-xs">{service.latency_ms}ms</span>
        <span
          css={[
            tw`text-xs font-bold px-2 py-0.5 border`,
            isOk
              ? tw`text-cpc-green-500 border-cpc-green-500`
              : tw`text-cpc-red-500 border-cpc-red-500`,
          ]}
        >
          {isOk ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>
    </div>
  )
}

export function StatusPage() {
  const { data, isLoading, isFetching, refetch } = useServiceHealth()

  return (
    <div tw="min-h-screen bg-black flex flex-col">
      <Header />
      <div tw="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div tw="flex items-center justify-between mb-6">
          <h1 tw="text-cpc-cyan-500 text-xl font-bold">SERVICE STATUS</h1>
          <CpcButton
            variant="outlined"
            color="cyan"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? 'CHECKING...' : 'REFRESH'}
          </CpcButton>
        </div>

        {isLoading ? (
          <div tw="text-cpc-cyan-500 text-sm animate-pulse">CHECKING SERVICES...</div>
        ) : data ? (
          <>
            <div tw="flex flex-col gap-2 mb-4">
              {data.services.map((service) => (
                <ServiceRow key={service.name} service={service} />
              ))}
            </div>

            {data.services.some((s) => s.error) && (
              <div tw="border-2 border-cpc-red-500/30 p-3 mb-4">
                <div tw="text-cpc-red-500 text-xs font-bold mb-2">ERRORS</div>
                {data.services
                  .filter((s) => s.error)
                  .map((s) => (
                    <div key={s.name} tw="text-cpc-red-500/80 text-xs mb-1">
                      {s.name}: {s.error}
                    </div>
                  ))}
              </div>
            )}

            <div tw="text-cpc-green-900 text-xs">
              LAST CHECKED: {new Date(data.checked_at).toLocaleString()}
            </div>
          </>
        ) : (
          <div tw="text-cpc-red-500 text-sm">FAILED TO REACH API</div>
        )}
      </div>
    </div>
  )
}
