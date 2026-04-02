import tw from 'twin.macro'
import { useTranslation } from 'react-i18next'
import { Folder, PasswordEntry } from '../../lib/crypto/vault'
import { colorStyles } from './types'
import { EntryCard } from './EntryCard'
import { AddEntryForm } from './AddEntryForm'
import { useVault } from './VaultContext'

interface FolderContentProps {
  folder: Folder | null
  entries: PasswordEntry[]
  folderIndex: number
}

export function FolderContent({ folder, entries, folderIndex }: FolderContentProps) {
  const { t } = useTranslation()
  const { addingToFolder, setAddingToFolder, deleteFolder } = useVault()
  const colors = folder?.color
    ? colorStyles[folder.color] || colorStyles.green
    : colorStyles.green

  const folderId = folder?.id ?? null
  const isAddingEntry = addingToFolder === (folderId ?? 'root')

  const handleAddClick = () => {
    setAddingToFolder(folderId ?? 'root')
  }

  return (
    <div tw="flex-1 flex flex-col h-full overflow-hidden">
      {/* Folder header */}
      <div tw="flex items-center justify-between px-4 py-2 border-b border-cpc-green-500/30">
        <div tw="flex items-center gap-2">
          <span tw="text-cpc-green-500 opacity-50 text-sm">[{folderIndex}]</span>
          <span css={[tw`font-bold text-sm`, colors.text]}>
            {folder ? folder.name : t('vault.unsorted')}
          </span>
          <span tw="text-cpc-green-900 text-xs">({entries.length})</span>
        </div>
        <div tw="flex items-center gap-2">
          {!isAddingEntry && (
            <button
              onClick={handleAddClick}
              tw="border border-cpc-cyan-500 text-cpc-cyan-500 px-2 py-0.5 text-xs hover:bg-cpc-cyan-500 hover:text-cpc-grey-900 transition-colors"
            >
              + {t('entry.add')}
            </button>
          )}
          {folder && (
            <button
              onClick={() => deleteFolder(folder.id)}
              tw="text-cpc-red-500 hover:text-cpc-red-900 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Entries list */}
      <div tw="flex-1 overflow-y-auto p-3">
        {entries.length === 0 && !isAddingEntry && (
          <div tw="text-center py-8 text-cpc-green-900 text-sm">
            {t('vault.empty.subtitle')}
          </div>
        )}

        <div tw="space-y-1">
          {entries.map((entry, index) => (
            <EntryCard key={entry.id} entry={entry} index={index + 1} />
          ))}
        </div>

        {isAddingEntry && (
          <div tw="mt-3">
            <AddEntryForm folderId={folderId} />
          </div>
        )}
      </div>
    </div>
  )
}
