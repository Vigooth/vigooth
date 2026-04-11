import { getTotpStatus } from '../../../lib/api/client'
import { CommandFn } from './types'

export const totp: CommandFn = async (args, ctx) => {
  const sub = (args[0] || '').toUpperCase()

  if (sub === 'STATUS') {
    try {
      const status = await getTotpStatus()
      return { output: status.enabled ? '2FA IS ENABLED' : '2FA IS NOT ENABLED' }
    } catch {
      return { output: 'ERROR: COULD NOT FETCH 2FA STATUS' }
    }
  }

  if (sub === 'DISABLE') {
    if (ctx.openTotpDisable) {
      ctx.openTotpDisable()
      return { output: 'OPENING 2FA DISABLE...' }
    }
    return { output: 'ERROR: 2FA DISABLE NOT AVAILABLE' }
  }

  // Default: setup
  if (!sub || sub === 'SETUP') {
    if (ctx.openTotpSetup) {
      ctx.openTotpSetup()
      return { output: 'OPENING 2FA SETUP...' }
    }
    return { output: 'ERROR: 2FA SETUP NOT AVAILABLE' }
  }

  return {
    output: [
      'USAGE: 2FA [COMMAND]',
      '',
      '  2FA          Open 2FA setup',
      '  2FA SETUP    Open 2FA setup',
      '  2FA STATUS   Check 2FA status',
      '  2FA DISABLE  Disable 2FA',
    ].join('\n'),
  }
}
