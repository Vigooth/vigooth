import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CpcLayout } from '@vigooth/ui'
import { getPortalUrl } from '@vigooth/config'
import { animatePulse } from '@vigooth/styles'
import tw from 'twin.macro'

export function UnlockPage() {
  const navigate = useNavigate()
  const [masterPassword, setMasterPassword] = useState('')
  const [error, setError] = useState('')
  const portalUrl = getPortalUrl()

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (masterPassword.length < 4) {
      setError('PASSWORD TOO SHORT')
      return
    }
    // TODO: Implement actual unlock logic with encryption
    navigate('/vault')
  }

  return (
    <CpcLayout>
      <div tw="h-full flex flex-col p-8">
        <a
          href={portalUrl}
          tw="inline-block mb-4 border-2 border-cpc-green-500 text-cpc-green-500 px-4 py-2 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors text-sm w-fit"
        >
          &lt; BACK TO PORTAL
        </a>

        <div tw="flex-1 flex flex-col items-center justify-center">
        <div tw="text-center mb-8">
          <div tw="text-cpc-red-500 text-4xl font-bold mb-2">CRYPT-LOCK</div>
          <div tw="text-cpc-cyan-500 text-sm">SECURE PASSWORD VAULT v1.0</div>
          <div tw="text-cpc-green-500 text-xs mt-1">Amstrad CPC 6128</div>
        </div>

        <div tw="border-4 border-cpc-green-500 p-8 bg-cpc-grey-900">
          <div tw="text-cpc-yellow-500 text-center mb-6">
            ENTER MASTER PASSWORD
          </div>

          <form onSubmit={handleUnlock}>
            <div tw="flex items-center gap-2 mb-4">
              <span tw="text-cpc-green-500">&gt;</span>
              <input
                type="password"
                value={masterPassword}
                onChange={(e) => {
                  setMasterPassword(e.target.value)
                  setError('')
                }}
                tw="bg-transparent border-2 border-cpc-green-500 text-cpc-green-500 px-4 py-2 font-cpc outline-none focus:border-cpc-yellow-500 w-64"
                autoFocus
              />
            </div>

            {error && (
              <div tw="text-cpc-red-500 text-center mb-4 text-sm">
                ERROR: {error}
              </div>
            )}

            <button
              type="submit"
              tw="w-full border-2 border-cpc-green-500 text-cpc-green-500 py-2 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors"
            >
              UNLOCK VAULT
            </button>
          </form>
        </div>

        <div css={[tw`text-cpc-cyan-500 text-xs mt-8 text-center`, animatePulse]}>
          <div>YOUR DATA IS ENCRYPTED LOCALLY</div>
          <div tw="mt-1 text-cpc-green-900">Zero-knowledge architecture</div>
        </div>
        </div>
      </div>
    </CpcLayout>
  )
}
