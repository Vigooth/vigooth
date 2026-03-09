import { CommandFn } from './types'
import { findFolderByName, countEntriesInFolder } from '@/utils/folderUtils'

export const rmdir: CommandFn = async (args, ctx, t) => {
  const hasForce = args.includes('--FORCE') || args.includes('--F')
  const name = args.find(a => !a.startsWith('-'))

  if (!name) {
    return { output: t('terminal.errors.usage.rmdir') }
  }

  const folder = ctx.vault?.folders ? findFolderByName(ctx.vault.folders, name) : null
  if (!folder) {
    return { output: t('terminal.errors.folderNotFound', { name }) }
  }

  // Check if folder has entries
  const entryCount = countEntriesInFolder(ctx.vault, folder.id)
  if (entryCount > 0 && !hasForce) {
    return { output: t('terminal.errors.folderNotEmpty', { name: folder.name, count: entryCount }) }
  }

  // If we're in the folder being deleted, go back to ROOT
  if (ctx.currentFolder?.id === folder.id) {
    ctx.setCurrentFolder(null)
  }

  await ctx.removeFolder(folder.id)
  return { output: t('terminal.success.rmdir', { name: folder.name }) }
}
