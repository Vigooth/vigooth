import { CommandFn } from './types'

type ColorType = 'green' | 'red' | 'cyan' | 'yellow' | 'magenta'
const validColors: ColorType[] = ['green', 'red', 'cyan', 'yellow', 'magenta']

export const mkdir: CommandFn = async (args, ctx, t) => {
  const name = args[0]
  if (!name) {
    return { output: t('terminal.errors.usage.mkdir') }
  }

  const color = (args[1]?.toLowerCase() || 'green') as ColorType
  if (!validColors.includes(color)) {
    return { output: t('terminal.errors.invalidColor') }
  }

  if (ctx.vault?.folders.find(f => f.name.normalize() === name.toUpperCase().normalize())) {
    return { output: t('terminal.errors.folderExists', { name }) }
  }

  await ctx.addFolder({
    id: ctx.generateId(),
    name: name.toUpperCase(),
    color,
    createdAt: new Date().toISOString(),
  })

  return { output: t('terminal.success.mkdir', { name: name.toUpperCase(), color }) }
}
