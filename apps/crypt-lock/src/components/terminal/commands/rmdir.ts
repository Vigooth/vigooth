import { CommandFn } from './types'

export const rmdir: CommandFn = async (args, ctx, t) => {
  const name = args[0]
  if (!name) {
    return { output: t('terminal.errors.usage.rmdir') }
  }

  const folder = ctx.vault?.folders.find(f => f.name.normalize() === name.normalize())
  if (!folder) {
    return { output: t('terminal.errors.folderNotFound', { name }) }
  }

  // If we're in the folder being deleted, go back to ROOT
  if (ctx.currentFolder?.id === folder.id) {
    ctx.setCurrentFolder(null)
  }

  await ctx.removeFolder(folder.id)
  return { output: t('terminal.success.rmdir', { name: folder.name }) }
}
