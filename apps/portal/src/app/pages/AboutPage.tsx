import { Link } from 'react-router-dom'
import { Navigation, CpcLayout } from '@vigooth/ui'
import 'twin.macro'

export function AboutPage() {
  return (
    <CpcLayout>
      <div tw="flex flex-col h-full">
        <Navigation />

        <div tw="p-8 flex-1 overflow-auto">
          <div tw="text-center mb-8 border-b-2 border-cpc-green-500 pb-4">
            <div tw="text-cpc-yellow-500 text-2xl font-bold">ABOUT</div>
            <div tw="text-cpc-cyan-500 text-sm mt-2">VIGOOTH SYSTEM v1.0</div>
          </div>

          <div tw="space-y-4 text-cpc-green-500">
            <p tw="text-lg">
              Welcome to the Vigooth System - a retro-styled terminal interface
              inspired by the classic Amstrad CPC 6128.
            </p>

            <div tw="mt-8 p-4 border border-cpc-magenta-900">
              <h2 tw="text-cpc-yellow-500 text-xl mb-4">Features:</h2>
              <ul tw="list-disc list-inside space-y-2">
                <li>CPC-style terminal interface</li>
                <li>Custom input components</li>
                <li>React Router navigation</li>
                <li>Tailwind CSS v3</li>
                <li>Storybook component library</li>
              </ul>
            </div>

            <div tw="mt-8">
              <Link
                to="/"
                tw="inline-block px-6 py-3 border-2 border-cpc-green-500 text-cpc-green-500 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors"
              >
                &lt; BACK TO HOME
              </Link>
            </div>
          </div>
        </div>
      </div>
    </CpcLayout>
  )
}
