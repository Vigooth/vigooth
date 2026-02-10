import { CommandFn } from './types'

export const ls: CommandFn = (_args, ctx, t) => {
  const folders = ctx.vault?.folders.map(f => {
    const marker = ctx.currentFolder?.id === f.id ? ' <--' : ''
    return `  ${f.name} (${f.color})${marker}`
  }).join('\n') || ''

  return { output: folders ? `${t('terminal.folders')}\n${folders}` : t('terminal.noFolders') }
}
