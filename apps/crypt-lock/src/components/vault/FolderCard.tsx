import tw from 'twin.macro'
import { Folder, PasswordEntry } from '../../lib/crypto/vault'
import { colorStyles } from './types'
import { EntryCard } from './EntryCard'
import { AddEntryForm } from './AddEntryForm'
import { useVault } from './VaultContext'

interface FolderCardProps {
  folder: Folder
  entries: PasswordEntry[]
  index: number
}

export function FolderCard({ folder, entries, index }: FolderCardProps) {
  const { addingToFolder, setAddingToFolder, deleteFolder } = useVault()
  const colors = colorStyles[folder.color || 'green']
  const isAddingEntry = addingToFolder === folder.id

  const handleHeaderClick = () => {
    if (!isAddingEntry) {
      setAddingToFolder(folder.id)
    }
  }

  return (
    <div tw="border-2 border-cpc-green-500 p-3">
      {/* Folder header */}
      <div tw="flex justify-between items-center mb-3">
        <div
          onClick={handleHeaderClick}
          css={[tw`font-bold flex items-center gap-2 cursor-pointer hover:opacity-80`, colors.text]}
        >
          <span tw="text-cpc-green-500 opacity-60">[{index}]</span>
          <span>📂</span>
          <span>{folder.name}</span>
          <span tw="text-xs opacity-60">({entries.length})</span>
        </div>
        <button
          onClick={() => deleteFolder(folder.id)}
          tw="text-cpc-red-500 hover:text-cpc-red-900 text-xs"
        >
          ✕
        </button>
      </div>

      {/* Entries */}
      <div tw="space-y-2">
        {entries.map((entry, entryIndex) => (
          <EntryCard key={entry.id} entry={entry} index={entryIndex + 1} />
        ))}

        {isAddingEntry && <AddEntryForm folderId={folder.id} />}
      </div>
    </div>
  )
}
