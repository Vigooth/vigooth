import { CommandFn } from './types'

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

  const maybeFolder = ctx.vault?.folders.find(f => f.name.normalize() === args[0].normalize())
  if (maybeFolder && args.length >= 2) {
    folderId = maybeFolder.id
    folderName = maybeFolder.name
    name = args[1]
    username = args[2] || ''
    password = args[3] || ''
    url = args[4] || ''
  } else if (args[0] === 'ROOT' && args.length >= 2) {
    folderId = null
    folderName = 'ROOT'
    name = args[1]
    username = args[2] || ''
    password = args[3] || ''
    url = args[4] || ''
  } else {
    name = args[0]
    username = args[1] || ''
    password = args[2] || ''
    url = args[3] || ''
  }

  await ctx.addEntry(folderId, { name, username, password, url })
  return { output: t('terminal.success.add', { name, folder: folderName }) }
}
