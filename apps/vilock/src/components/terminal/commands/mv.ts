import { CommandFn } from './types'
import { PasswordEntry } from '@/lib/crypto/vault'
import { getFolderByIndex, getEntriesForFolder } from '@/utils/folderUtils'

interface ParsedSource {
  folderIndex: number
  entryIndices: number[]
}

// Parse source patterns: 1.2, 1{1,3,5}, 1{1..4}, 1*
const parseSource = (source: string): ParsedSource | null => {
  // Pattern: 1.2 (single entry)
  const singleMatch = source.match(/^(\d+)\.(\d+)$/)
  if (singleMatch) {
    return {
      folderIndex: parseInt(singleMatch[1], 10),
      entryIndices: [parseInt(singleMatch[2], 10)]
    }
  }

  // Pattern: 1{1,3,5} (list)
  const listMatch = source.match(/^(\d+)\{([\d,]+)\}$/)
  if (listMatch) {
    const indices = listMatch[2].split(',').map(n => parseInt(n, 10))
    return {
      folderIndex: parseInt(listMatch[1], 10),
      entryIndices: indices
    }
  }

  // Pattern: 1{1..4} (range)
  const rangeMatch = source.match(/^(\d+)\{(\d+)\.\.(\d+)\}$/)
  if (rangeMatch) {
    const start = parseInt(rangeMatch[2], 10)
    const end = parseInt(rangeMatch[3], 10)
    const indices: number[] = []
    for (let i = start; i <= end; i++) {
      indices.push(i)
    }
    return {
      folderIndex: parseInt(rangeMatch[1], 10),
      entryIndices: indices
    }
  }

  // Pattern: 1* (all entries)
  const wildcardMatch = source.match(/^(\d+)\*$/)
  if (wildcardMatch) {
    return {
      folderIndex: parseInt(wildcardMatch[1], 10),
      entryIndices: [] // Empty means all
    }
  }

  return null
}

export const mv: CommandFn = async (args, ctx, t) => {
  if (args.length < 2) {
    return { output: t('terminal.errors.usage.mv') }
  }

  const source = args[0]
  const targetFolderIndex = parseInt(args[1], 10)

  if (isNaN(targetFolderIndex)) {
    return { output: t('terminal.errors.usage.mv') }
  }

  const parsed = parseSource(source)
  if (!parsed) {
    return { output: t('terminal.errors.usage.mv') }
  }

  // Get source folder entries
  let sourceFolderId: string | null = null
  let sourceFolderName = ''

  if (parsed.folderIndex === 0) {
    sourceFolderId = null
    sourceFolderName = 'ROOT'
  } else {
    const sourceFolder = ctx.vault?.folders ? getFolderByIndex(ctx.vault.folders, parsed.folderIndex) : null
    if (!sourceFolder) {
      return { output: t('terminal.errors.folderNotFound', { name: parsed.folderIndex.toString() }) }
    }
    sourceFolderId = sourceFolder.id
    sourceFolderName = sourceFolder.name
  }

  const sourceEntries = getEntriesForFolder(ctx.vault, sourceFolderId)

  // Get target folder
  let targetFolderId: string | null = null
  let targetFolderName = ''

  if (targetFolderIndex === 0) {
    targetFolderId = null
    targetFolderName = 'ROOT'
  } else {
    const targetFolder = ctx.vault?.folders ? getFolderByIndex(ctx.vault.folders, targetFolderIndex) : null
    if (!targetFolder) {
      return { output: t('terminal.errors.folderNotFound', { name: targetFolderIndex.toString() }) }
    }
    targetFolderId = targetFolder.id
    targetFolderName = targetFolder.name
  }

  // Determine which entries to move
  let entriesToMove: PasswordEntry[] = []

  if (parsed.entryIndices.length === 0) {
    // Wildcard: move all
    entriesToMove = sourceEntries
  } else {
    // Specific indices
    for (const idx of parsed.entryIndices) {
      const entry = sourceEntries[idx - 1]
      if (entry) {
        entriesToMove.push(entry)
      }
    }
  }

  if (entriesToMove.length === 0) {
    return { output: t('terminal.errors.noEntriesToMove') }
  }

  // Move all entries in one batch
  const entryIds = entriesToMove.map(e => e.id)
  await ctx.moveEntries(entryIds, targetFolderId)

  return {
    output: t('terminal.success.mv', {
      count: entriesToMove.length,
      source: sourceFolderName,
      target: targetFolderName
    })
  }
}
