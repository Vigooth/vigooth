import { Link } from 'react-router-dom'
import { CpcLayout } from '@vigooth/ui'
import 'twin.macro'

export function HomePage() {
  return (
    <CpcLayout>
      <div tw="h-full flex flex-col items-center justify-center p-8">
        <div tw="text-cpc-red-500 text-6xl font-bold mb-4">404</div>
        <div tw="text-cpc-yellow-500 text-xl mb-8">PAGE NOT FOUND</div>
        <Link
          to="/"
          tw="border-2 border-cpc-green-500 text-cpc-green-500 px-6 py-2 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors"
        >
          RETURN TO VAULT
        </Link>
      </div>
    </CpcLayout>
  )
}
