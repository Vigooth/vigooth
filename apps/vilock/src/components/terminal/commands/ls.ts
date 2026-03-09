import { CommandFn } from './types'
import { getEntriesForFolder, countEntriesInFolder } from '@/utils/folderUtils'

export const ls: CommandFn = (_args, ctx, t) => {
  const rootCount = countEntriesInFolder(ctx.vault, null)
  const rootLine = `  [0] ROOT (${rootCount})`

  const folders = ctx.vault?.folders.map((f, i) => {
    const marker = ctx.currentFolder?.id === f.id ? ' <--' : ''
    const entryCount = countEntriesInFolder(ctx.vault, f.id)
    return `  [${i + 1}] ${f.name} (${entryCount})${marker}`
  }).join('\n') || ''

  const output = folders ? `${t('terminal.folders')}\n${rootLine}\n${folders}` : `${t('terminal.folders')}\n${rootLine}`
  return { output }
}
