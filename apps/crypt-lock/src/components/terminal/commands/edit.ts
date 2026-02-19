import { CommandFn } from './types'
import { getFolderByIndex, getEntriesForFolder } from '@/utils/folderUtils'

const FIELD_MAP: Record<string, string> = {
  name: 'name',
  user: 'username',
  pwd: 'password',
  url: 'url',
}

export const edit: CommandFn = async (args, ctx, t) => {
  const target = args[0]

  if (!target || !target.includes('.')) {
    return { output: t('terminal.errors.usage.edit') }
  }

  const [folderPart, entryPart] = target.split('.')
  const folderIndex = parseInt(folderPart, 10)
  const entryIndex = parseInt(entryPart, 10)

  if (isNaN(folderIndex) || isNaN(entryIndex)) {
    return { output: t('terminal.errors.usage.edit') }
  }

  // Parse key=value pairs from remaining args
  const updates: Record<string, string> = {}
  const fieldArgs = args.slice(1)

  for (const arg of fieldArgs) {
    const eqIndex = arg.indexOf('=')
    if (eqIndex === -1) continue
    const key = arg.slice(0, eqIndex).toLowerCase()
    const value = arg.slice(eqIndex + 1)
    const mapped = FIELD_MAP[key]
    if (mapped) {
      updates[mapped] = value
    }
  }

  if (Object.keys(updates).length === 0) {
    return { output: t('terminal.errors.noFields') }
  }

  // Resolve folder
  let folderId: string | null = null

  if (folderIndex === 0) {
    folderId = null
  } else {
    const folder = ctx.vault?.folders ? getFolderByIndex(ctx.vault.folders, folderIndex) : null
    if (!folder) {
      return { output: t('terminal.errors.folderNotFound', { name: folderIndex.toString() }) }
    }
    folderId = folder.id
  }

  // Resolve entry
  const entries = getEntriesForFolder(ctx.vault, folderId)
  const entry = entries[entryIndex - 1]
  if (!entry) {
    return { output: t('terminal.errors.entryNotFound', { index: `${folderIndex}.${entryIndex}` }) }
  }

  await ctx.updateEntry(entry.id, updates)

  const fieldNames = Object.keys(updates).join(', ')
  return { output: t('terminal.success.edit', { name: entry.name, fields: fieldNames }) }
}
