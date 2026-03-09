import { Folder, PasswordEntry, VaultData } from '../lib/crypto/vault'

/**
 * Find a folder by name (case-insensitive, normalized)
 */
export function findFolderByName(folders: Folder[], name: string): Folder | undefined {
  return folders.find(f => f.name.normalize() === name.normalize())
}

/**
 * Get a folder by its index (1-based)
 */
export function getFolderByIndex(folders: Folder[], index: number): Folder | undefined {
  return folders[index - 1]
}

/**
 * Get the index of a folder (1-based, 0 for ROOT)
 */
export function getFolderIndex(folders: Folder[], folderId: string | undefined): number {
  if (!folderId) return 0
  const index = folders.findIndex(f => f.id === folderId)
  return index === -1 ? 0 : index + 1
}

/**
 * Get entries for a specific folder (null = ROOT)
 */
export function getEntriesForFolder(vault: VaultData | null, folderId: string | null): PasswordEntry[] {
  if (!vault) return []
  return vault.entries.filter(e =>
    folderId ? e.folderId === folderId : !e.folderId
  )
}

/**
 * Get entry by folder index and entry index (both 1-based, folder 0 = ROOT)
 */
export function getEntryByIndices(
  vault: VaultData | null,
  folderIndex: number,
  entryIndex: number
): { entry: PasswordEntry | undefined; folderName: string } {
  if (!vault) return { entry: undefined, folderName: '' }

  let entries: PasswordEntry[] = []
  let folderName = ''

  if (folderIndex === 0) {
    entries = vault.entries.filter(e => !e.folderId)
    folderName = 'ROOT'
  } else {
    const folder = vault.folders[folderIndex - 1]
    if (!folder) return { entry: undefined, folderName: '' }
    entries = vault.entries.filter(e => e.folderId === folder.id)
    folderName = folder.name
  }

  return {
    entry: entries[entryIndex - 1],
    folderName
  }
}

/**
 * Check if folder has entries
 */
export function folderHasEntries(vault: VaultData | null, folderId: string): boolean {
  if (!vault) return false
  return vault.entries.some(e => e.folderId === folderId)
}

/**
 * Count entries in a folder
 */
export function countEntriesInFolder(vault: VaultData | null, folderId: string | null): number {
  if (!vault) return 0
  return vault.entries.filter(e =>
    folderId ? e.folderId === folderId : !e.folderId
  ).length
}
