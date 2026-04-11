import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CpcLayout } from '@vigooth/ui'
import { animatePulse } from '@vigooth/styles'
import tw from 'twin.macro'
import { useAuth } from '../../stores/auth'
import { verifyTotpLogin, verifyRecoveryCode } from '../../lib/api/client'

export function TotpVerifyPage() {
  const navigate = useNavigate()
  const { totpPending, login: authLogin, setTotpPending } = useAuth()
  const [code, setCode] = useState('')
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!totpPending) {
    navigate('/login')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!code.trim()) {
      setError('CODE REQUIRED')
      return
    }

    setLoading(true)

    try {
      const response = recoveryMode
        ? await verifyRecoveryCode(code.trim())
        : await verifyTotpLogin(code.trim())

      authLogin({
        id: response.user.id,
        email: response.user.email,
      })

      navigate('/unlock')
    } catch (err) {
      setError(err instanceof Error ? err.message.toUpperCase() : 'VERIFICATION FAILED')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setTotpPending(false)
    navigate('/login')
  }

  const toggleRecoveryMode = () => {
    setRecoveryMode(!recoveryMode)
    setCode('')
    setError('')
  }

  return (
    <CpcLayout>
      <div tw="h-full flex flex-col p-8">
        <button
          onClick={handleCancel}
          tw="inline-block mb-4 border-2 border-cpc-green-500 text-cpc-green-500 px-4 py-2 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors text-sm w-fit"
        >
          &lt; BACK TO LOGIN
        </button>

        <div tw="flex-1 flex flex-col items-center justify-center">
          <div tw="text-center mb-8">
            <div tw="text-cpc-red-500 text-4xl font-bold mb-2">VILOCK</div>
            <div tw="text-cpc-yellow-500 text-sm">2FA VERIFICATION</div>
          </div>

          <div tw="border-4 border-cpc-green-500 p-8 bg-cpc-grey-900 w-full max-w-md">
            <div tw="text-cpc-cyan-500 text-center mb-6 text-sm">
              {recoveryMode
                ? 'ENTER RECOVERY CODE'
                : 'ENTER 6-DIGIT CODE FROM YOUR AUTHENTICATOR APP'}
            </div>

            <form onSubmit={handleSubmit}>
              <div tw="flex items-center gap-2 mb-4">
                <span tw="text-cpc-green-500">&gt;</span>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    setError('')
                  }}
                  placeholder={recoveryMode ? 'xxxx-xxxx' : '000000'}
                  maxLength={recoveryMode ? 9 : 6}
                  autoComplete="one-time-code"
                  tw="flex-1 bg-transparent border-2 border-cpc-green-500 text-cpc-green-500 px-4 py-2 font-cpc outline-none focus:border-cpc-yellow-500 text-center text-xl tracking-widest placeholder:text-cpc-green-900"
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
                disabled={loading}
                css={[
                  tw`w-full border-2 border-cpc-green-500 text-cpc-green-500 py-2 transition-colors`,
                  loading
                    ? tw`opacity-50 cursor-not-allowed`
                    : tw`hover:bg-cpc-green-500 hover:text-cpc-grey-900`,
                ]}
              >
                {loading ? 'VERIFYING...' : 'VERIFY'}
              </button>
            </form>

            <button
              onClick={toggleRecoveryMode}
              tw="w-full text-cpc-cyan-500 text-xs mt-4 text-center hover:text-cpc-yellow-500 transition-colors"
            >
              {recoveryMode ? 'USE AUTHENTICATOR CODE' : 'USE RECOVERY CODE'}
            </button>
          </div>

          <div css={[tw`text-cpc-cyan-500 text-xs mt-8 text-center`, animatePulse]}>
            <div>TWO-FACTOR AUTHENTICATION</div>
            <div tw="mt-1 text-cpc-green-900">Additional security layer</div>
          </div>
        </div>
      </div>
    </CpcLayout>
  )
}
