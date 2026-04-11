import { useState, useEffect } from 'react'
import { setupTotp, enableTotp, getTotpStatus } from '../../lib/api/client'

type Step = 'loading' | 'already-enabled' | 'qr' | 'recovery' | 'error'

export function useTotpSetup() {
  const [step, setStep] = useState<Step>('loading')
  const [qrUri, setQrUri] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const status = await getTotpStatus()
        if (status.enabled) {
          setStep('already-enabled')
          return
        }
        const resp = await setupTotp()
        setQrUri(resp.qr_code_uri)
        setSecret(resp.secret)
        setStep('qr')
      } catch {
        setStep('error')
      }
    }
    init()
  }, [])

  const setCodeValue = (raw: string) => {
    setCode(raw.replace(/\D/g, '').slice(0, 6))
    setError('')
  }

  const verify = async () => {
    if (code.length !== 6) {
      setError('CODE MUST BE 6 DIGITS')
      return
    }
    setError('')
    setVerifying(true)
    try {
      const resp = await enableTotp(code)
      setRecoveryCodes(resp.recovery_codes)
      setStep('recovery')
    } catch (err) {
      setError(err instanceof Error ? err.message.toUpperCase() : 'VERIFICATION FAILED')
    } finally {
      setVerifying(false)
    }
  }

  const copyAll = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return { step, qrUri, secret, code, setCode: setCodeValue, recoveryCodes, error, verifying, copied, verify, copyAll }
}
