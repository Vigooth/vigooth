import { CommandFn } from './types'
import { findFolderByName, getFolderByIndex } from '@/utils/folderUtils'

export const cd: CommandFn = (args, ctx, t) => {
  const target = args[0]

  if (!target || target === '..' || target === '/' || target === 'ROOT' || target === '0') {
    ctx.setCurrentFolder(null)
    return { output: t('terminal.success.cd', { folder: 'ROOT' }) }
  }

  // Try by index first
  const indexMatch = target.match(/^\d+$/)
  let folder = null
  if (indexMatch && ctx.vault?.folders) {
    folder = getFolderByIndex(ctx.vault.folders, parseInt(target, 10))
  }
  // Otherwise by name
  if (!folder && ctx.vault?.folders) {
    folder = findFolderByName(ctx.vault.folders, target)
  }

  if (!folder) {
    return { output: t('terminal.errors.folderNotFound', { name: target }) }
  }

  ctx.setCurrentFolder({ id: folder.id, name: folder.name })
  return { output: t('terminal.success.cd', { folder: folder.name }) }
}
