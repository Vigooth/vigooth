import { Link } from 'react-router-dom'
import { CpcLayout } from '@vigooth/ui'
import 'twin.macro'

export function NotFoundPage() {
  return (
    <CpcLayout>
      <div tw="h-full w-full flex items-center justify-center">
        <div tw="text-center p-8">
          <div tw="text-cpc-red-500 text-6xl font-bold mb-4">404</div>
          <div tw="text-cpc-yellow-500 text-2xl mb-8">PAGE NOT FOUND</div>

          <div tw="text-cpc-green-500 mb-8">
            <p>ERROR: The requested page does not exist in memory.</p>
            <p tw="mt-2 text-cpc-cyan-500">Press any key to continue...</p>
          </div>

          <Link
            to="/"
            tw="inline-block px-6 py-3 border-2 border-cpc-green-500 text-cpc-green-500 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors"
          >
            RETURN TO HOME
          </Link>
        </div>
      </div>
    </CpcLayout>
  )
}
