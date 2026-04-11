import { useState, useEffect } from 'react'
import { disableTotp, getTotpStatus } from '../../lib/api/client'

type Step = 'loading' | 'not-enabled' | 'confirm' | 'done' | 'error'

export function useTotpDisable() {
  const [step, setStep] = useState<Step>('loading')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [disabling, setDisabling] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const status = await getTotpStatus()
        setStep(status.enabled ? 'confirm' : 'not-enabled')
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

  const disable = async () => {
    if (code.length !== 6) {
      setError('CODE MUST BE 6 DIGITS')
      return
    }
    setError('')
    setDisabling(true)
    try {
      await disableTotp(code)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message.toUpperCase() : 'DISABLE FAILED')
    } finally {
      setDisabling(false)
    }
  }

  return { step, code, setCode: setCodeValue, error, disabling, disable }
}
