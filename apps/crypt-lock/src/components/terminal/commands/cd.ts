import { CommandFn } from './types'

export const cd: CommandFn = (args, ctx, t) => {
  const target = args[0]

  if (!target || target === '..' || target === '/' || target === 'ROOT') {
    ctx.setCurrentFolder(null)
    return { output: t('terminal.success.cd', { folder: 'ROOT' }) }
  }

  const folder = ctx.vault?.folders.find(f => f.name.normalize() === target.normalize())
  if (!folder) {
    return { output: t('terminal.errors.folderNotFound', { name: target }) }
  }

  ctx.setCurrentFolder({ id: folder.id, name: folder.name })
  return { output: t('terminal.success.cd', { folder: folder.name }) }
}
