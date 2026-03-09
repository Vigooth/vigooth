import { CommandFn } from './types'

export const gen: CommandFn = (args, ctx) => {
  const length = parseInt(args[0]) || 20
  const clampedLength = Math.min(Math.max(length, 8), 64)
  const password = ctx.generatePassword(clampedLength)

  return { output: password }
}
