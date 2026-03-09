import { CommandFn } from './types'
import { getFolderByIndex, getEntriesForFolder, countEntriesInFolder } from '@/utils/folderUtils'

export const rm: CommandFn = async (args, ctx, t) => {
  const hasForce = args.includes('--FORCE') || args.includes('--F')
  const target = args.find(a => !a.startsWith('-'))

  if (!target) {
    return { output: t('terminal.errors.usage.rm') }
  }

  // Check if it's an entry (format: folderIndex.entryIndex)
  if (target.includes('.')) {
    const [folderPart, entryPart] = target.split('.')
    const folderIndex = parseInt(folderPart, 10)
    const entryIndex = parseInt(entryPart, 10)

    if (isNaN(folderIndex) || isNaN(entryIndex)) {
      return { output: t('terminal.errors.usage.rm') }
    }

    let folderId: string | null = null
    let folderName = ''

    if (folderIndex === 0) {
      folderId = null
      folderName = 'ROOT'
    } else {
      const folder = ctx.vault?.folders ? getFolderByIndex(ctx.vault.folders, folderIndex) : null
      if (!folder) {
        return { output: t('terminal.errors.folderNotFound', { name: folderIndex.toString() }) }
      }
      folderId = folder.id
      folderName = folder.name
    }

    const entries = getEntriesForFolder(ctx.vault, folderId)
    const entry = entries[entryIndex - 1]
    if (!entry) {
      return { output: t('terminal.errors.entryNotFound', { index: `${folderIndex}.${entryIndex}` }) }
    }

    await ctx.removeEntry(entry.id)
    return { output: t('terminal.success.rmEntry', { name: entry.name, folder: folderName }) }
  }

  // It's a folder
  const folderIndex = parseInt(target, 10)
  if (isNaN(folderIndex)) {
    return { output: t('terminal.errors.usage.rm') }
  }

  if (folderIndex === 0) {
    return { output: t('terminal.errors.cannotDeleteRoot') }
  }

  const folder = ctx.vault?.folders ? getFolderByIndex(ctx.vault.folders, folderIndex) : null
  if (!folder) {
    return { output: t('terminal.errors.folderNotFound', { name: target }) }
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
