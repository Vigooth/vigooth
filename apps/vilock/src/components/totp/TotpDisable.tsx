import { useState } from 'react'
import tw from 'twin.macro'
import { disableTotp, getTotpStatus } from '../../lib/api/client'

type Step = 'loading' | 'not-enabled' | 'confirm' | 'done' | 'error'

export function TotpDisable({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('loading')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const initCheck = async () => {
    try {
      const status = await getTotpStatus()
      setStep(status.enabled ? 'confirm' : 'not-enabled')
    } catch {
      setStep('error')
    }
  }

  if (step === 'loading') {
    initCheck()
  }

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (code.length !== 6) {
      setError('CODE MUST BE 6 DIGITS')
      return
    }
    setLoading(true)
    try {
      await disableTotp(code)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message.toUpperCase() : 'DISABLE FAILED')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'loading') {
    return <div tw="p-6 text-cpc-green-500 text-center">LOADING...</div>
  }

  if (step === 'error') {
    return (
      <div tw="p-6">
        <div tw="text-cpc-red-500 text-center mb-4">ERROR: COULD NOT CHECK 2FA STATUS</div>
        <button
          onClick={onClose}
          tw="w-full border-2 border-cpc-green-500 text-cpc-green-500 py-2 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors"
        >
          CLOSE
        </button>
      </div>
    )
  }

  if (step === 'not-enabled') {
    return (
      <div tw="p-6">
        <div tw="text-cpc-yellow-500 text-center mb-4">2FA IS NOT ENABLED</div>
        <button
          onClick={onClose}
          tw="w-full border-2 border-cpc-green-500 text-cpc-green-500 py-2 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors"
        >
          CLOSE
        </button>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div tw="p-6">
        <div tw="text-cpc-green-500 text-center mb-4 text-lg">2FA DISABLED</div>
        <div tw="text-cpc-green-900 text-xs text-center mb-4">
          You can re-enable it anytime with &quot;2FA SETUP&quot;.
        </div>
        <button
          onClick={onClose}
          tw="w-full border-2 border-cpc-green-500 text-cpc-green-500 py-2 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors"
        >
          CLOSE
        </button>
      </div>
    )
  }

  return (
    <div tw="p-6">
      <div tw="text-cpc-red-500 text-center mb-4 text-lg">DISABLE 2FA</div>
      <div tw="text-cpc-cyan-500 text-center text-sm mb-4">
        ENTER CODE FROM YOUR AUTHENTICATOR APP TO CONFIRM
      </div>

      <form onSubmit={handleDisable}>
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
            setError('')
          }}
          placeholder="000000"
          maxLength={6}
          autoComplete="one-time-code"
          tw="w-full bg-transparent border-2 border-cpc-green-500 text-cpc-green-500 px-4 py-2 font-cpc outline-none focus:border-cpc-yellow-500 text-center text-xl tracking-widest mb-4 placeholder:text-cpc-green-900"
          autoFocus
        />

        {error && (
          <div tw="text-cpc-red-500 text-center mb-4 text-sm">
            ERROR: {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          css={[
            tw`w-full border-2 border-cpc-red-500 text-cpc-red-500 py-2 transition-colors mb-2`,
            loading
              ? tw`opacity-50 cursor-not-allowed`
              : tw`hover:bg-cpc-red-500 hover:text-cpc-grey-900`,
          ]}
        >
          {loading ? 'DISABLING...' : 'DISABLE 2FA'}
        </button>

        <button
          type="button"
          onClick={onClose}
          tw="w-full text-cpc-green-900 text-xs text-center hover:text-cpc-green-500 transition-colors"
        >
          CANCEL
        </button>
      </form>
    </div>
  )
}
