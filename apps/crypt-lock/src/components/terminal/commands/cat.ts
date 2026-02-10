import { CommandFn } from './types'

export const cat: CommandFn = (args, ctx, t) => {
  const folderName = args[0]
  let entries = []
  let targetName = ''

  if (!folderName) {
    if (ctx.currentFolder) {
      entries = ctx.vault?.entries.filter(e => e.folderId === ctx.currentFolder!.id) || []
      targetName = ctx.currentFolder.name
    } else {
      entries = ctx.vault?.entries.filter(e => !e.folderId) || []
      targetName = 'ROOT'
    }
  } else if (folderName === 'ROOT') {
    entries = ctx.vault?.entries.filter(e => !e.folderId) || []
    targetName = 'ROOT'
  } else {
    const folder = ctx.vault?.folders.find(f => f.name.normalize() === folderName.normalize())
    if (!folder) {
      return { output: t('terminal.errors.folderNotFound', { name: folderName }) }
    }
    entries = ctx.vault?.entries.filter(e => e.folderId === folder.id) || []
    targetName = folder.name
  }

  const output = entries.length
    ? `${targetName}:\n` + entries.map(e => `  ${e.name} (${e.username || '-'})`).join('\n')
    : `${targetName}: ${t('terminal.empty')}`

  return { output }
}
