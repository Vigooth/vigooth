import { CommandFn } from './types'
import { PasswordEntry } from '@/lib/crypto/vault'
import { findFolderByName, getFolderByIndex, getFolderIndex, getEntriesForFolder } from '@/utils/folderUtils'

export const cat: CommandFn = (args, ctx, t) => {
  const folderArg = args[0]
  let entries: PasswordEntry[] = []
  let targetName = ''
  let folderIndex = 0

  if (!folderArg) {
    if (ctx.currentFolder) {
      entries = getEntriesForFolder(ctx.vault, ctx.currentFolder.id)
      targetName = ctx.currentFolder.name
      folderIndex = getFolderIndex(ctx.vault?.folders || [], ctx.currentFolder.id)
    } else {
      entries = getEntriesForFolder(ctx.vault, null)
      targetName = 'ROOT'
      folderIndex = 0
    }
  } else if (folderArg === 'ROOT' || folderArg === '0') {
    entries = getEntriesForFolder(ctx.vault, null)
    targetName = 'ROOT'
    folderIndex = 0
  } else {
    // Try to find by index first
    const indexMatch = folderArg.match(/^\d+$/)
    let folder = null
    if (indexMatch && ctx.vault?.folders) {
      folderIndex = parseInt(folderArg, 10)
      folder = getFolderByIndex(ctx.vault.folders, folderIndex)
    }
    // Otherwise find by name
    if (!folder && ctx.vault?.folders) {
      folder = findFolderByName(ctx.vault.folders, folderArg)
      if (folder) {
        folderIndex = getFolderIndex(ctx.vault.folders, folder.id)
      }
    }
    if (!folder) {
      return { output: t('terminal.errors.folderNotFound', { name: folderArg }) }
    }
    entries = getEntriesForFolder(ctx.vault, folder.id)
    targetName = folder.name
  }

  const output = entries.length
    ? `[${folderIndex}] ${targetName}:\n` + entries.map((e, i) => `  [${i + 1}] ${e.name} (${e.username || '-'})`).join('\n')
    : `[${folderIndex}] ${targetName}: ${t('terminal.empty')}`

  return { output }
}
