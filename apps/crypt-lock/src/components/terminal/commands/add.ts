import { CommandFn } from './types'
import { findFolderByName, getFolderByIndex } from '@/utils/folderUtils'

export const add: CommandFn = async (args, ctx, t) => {
  if (args.length < 1) {
    return { output: t('terminal.errors.usage.add') }
  }

  let folderId: string | null = ctx.currentFolder?.id || null
  let folderName = ctx.currentFolder?.name || 'ROOT'
  let name: string
  let username = ''
  let password = ''
  let url = ''

  // Check if first arg is a folder reference (index, name, or ROOT)
  let folder = null
  const firstArg = args[0]

  if (firstArg === 'ROOT' || firstArg === '0') {
    // Explicit ROOT
    if (args.length >= 2) {
      folderId = null
      folderName = 'ROOT'
      name = args[1]
      username = args[2] || ''
      password = args[3] || ''
      url = args[4] || ''
      await ctx.addEntry(folderId, { name, username, password, url })
      return { output: t('terminal.success.add', { name, folder: folderName }) }
    }
  } else if (args.length >= 2) {
    // Try by index first
    const indexMatch = firstArg.match(/^(\d+)$/)
    if (indexMatch && ctx.vault?.folders) {
      folder = getFolderByIndex(ctx.vault.folders, parseInt(firstArg, 10))
    }
    // Otherwise try by name
    if (!folder && ctx.vault?.folders) {
      folder = findFolderByName(ctx.vault.folders, firstArg)
    }

    if (folder) {
      folderId = folder.id
      folderName = folder.name
      name = args[1]
      username = args[2] || ''
      password = args[3] || ''
      url = args[4] || ''
      await ctx.addEntry(folderId, { name, username, password, url })
      return { output: t('terminal.success.add', { name, folder: folderName }) }
    }
  }

  // No folder specified, add to current folder
  name = args[0]
  username = args[1] || ''
  password = args[2] || ''
  url = args[3] || ''

  await ctx.addEntry(folderId, { name, username, password, url })
  return { output: t('terminal.success.add', { name, folder: folderName }) }
}
