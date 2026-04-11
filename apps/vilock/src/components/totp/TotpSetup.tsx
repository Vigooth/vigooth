import { QRCodeSVG } from 'qrcode.react'
import tw from 'twin.macro'
import { useTotpSetup } from './useTotpSetup'

export function TotpSetup({ onClose }: { onClose: () => void }) {
  const { step, qrUri, secret, code, setCode, recoveryCodes, error, verifying, copied, verify, copyAll } = useTotpSetup()

  if (step === 'loading') {
    return <div tw="p-6 text-cpc-green-500 text-center">LOADING...</div>
  }

  if (step === 'error') {
    return (
      <div tw="p-6">
        <div tw="text-cpc-red-500 text-center mb-4">ERROR: COULD NOT SETUP 2FA</div>
        <button
          onClick={onClose}
          tw="w-full border-2 border-cpc-green-500 text-cpc-green-500 py-2 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors"
        >
          CLOSE
        </button>
      </div>
    )
  }

  if (step === 'already-enabled') {
    return (
      <div tw="p-6">
        <div tw="text-cpc-yellow-500 text-center mb-4">2FA IS ALREADY ENABLED</div>
        <div tw="text-cpc-green-900 text-xs text-center mb-4">
          Use &quot;2FA DISABLE&quot; in the terminal to disable it first.
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

  if (step === 'recovery') {
    return (
      <div tw="p-6">
        <div tw="text-cpc-green-500 text-center mb-2 text-lg">2FA ENABLED</div>
        <div tw="text-cpc-red-500 text-center mb-4 text-sm font-bold">
          SAVE THESE RECOVERY CODES. THEY WILL NOT BE SHOWN AGAIN.
        </div>

        <div tw="border-2 border-cpc-yellow-500 p-4 mb-4">
          <div tw="grid grid-cols-2 gap-2">
            {recoveryCodes.map((c, i) => (
              <div key={i} tw="text-cpc-yellow-500 text-center font-mono text-sm">
                {c}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={copyAll}
          tw="w-full border-2 border-cpc-cyan-500 text-cpc-cyan-500 py-2 mb-2 hover:bg-cpc-cyan-500 hover:text-cpc-grey-900 transition-colors text-sm"
        >
          {copied ? 'COPIED!' : 'COPY ALL'}
        </button>

        <button
          onClick={onClose}
          tw="w-full border-2 border-cpc-green-500 text-cpc-green-500 py-2 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors"
        >
          I SAVED MY CODES
        </button>
      </div>
    )
  }

  // Step: QR code + verification
  return (
    <div tw="p-6">
      <div tw="text-cpc-yellow-500 text-center mb-4 text-lg">ENABLE 2FA</div>

      <div tw="text-cpc-cyan-500 text-center text-sm mb-4">
        SCAN WITH AUTHENTICATOR APP
      </div>

      <div tw="flex justify-center mb-4">
        <div tw="bg-white p-3 rounded">
          <QRCodeSVG value={qrUri} size={180} />
        </div>
      </div>

      <div tw="text-cpc-green-900 text-xs text-center mb-2">MANUAL ENTRY:</div>
      <div
        tw="text-cpc-green-500 text-xs text-center mb-4 font-mono break-all select-all cursor-pointer"
        title="Click to select"
      >
        {secret}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); verify() }}>
        <div tw="text-cpc-cyan-500 text-sm mb-2">ENTER CODE FROM APP:</div>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
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
          disabled={verifying}
          css={[
            tw`w-full border-2 border-cpc-green-500 text-cpc-green-500 py-2 transition-colors mb-2`,
            verifying
              ? tw`opacity-50 cursor-not-allowed`
              : tw`hover:bg-cpc-green-500 hover:text-cpc-grey-900`,
          ]}
        >
          {verifying ? 'VERIFYING...' : 'VERIFY & ENABLE'}
        </button>

        <button
          type="button"
          onClick={onClose}
          tw="w-full text-cpc-green-900 text-xs text-center hover:text-cpc-red-500 transition-colors"
        >
          CANCEL
        </button>
      </form>
    </div>
  )
}
