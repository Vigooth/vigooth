import { CommandFn } from './types'
import { ColorType, isValidColor } from '../../../types/colors'
import { findFolderByName } from '../../../utils/folderUtils'

export const mkdir: CommandFn = async (args, ctx, t) => {
  const name = args[0]
  if (!name) {
    return { output: t('terminal.errors.usage.mkdir') }
  }

  const colorArg = args[1]?.toLowerCase()
  const color: ColorType = isValidColor(colorArg) ? colorArg : 'green'
  if (colorArg && !isValidColor(colorArg)) {
    return { output: t('terminal.errors.invalidColor') }
  }

  if (ctx.vault?.folders && findFolderByName(ctx.vault.folders, name.toUpperCase())) {
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
