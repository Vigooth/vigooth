import { useState } from 'react'
import tw from 'twin.macro'
import { useTranslation } from 'react-i18next'
import { Folder, PasswordEntry } from '../../lib/crypto/vault'
import { colorStyles, ColorType } from './types'
import { AddFolderForm } from './AddFolderForm'

interface SidebarProps {
  folders: Folder[]
  entries: PasswordEntry[]
  selectedFolderId: string | null
  onSelectFolder: (folderId: string | null) => void
  onDeleteFolder: (folderId: string) => void
  showAddFolder: boolean
  onShowAddFolder: (show: boolean) => void
  newFolder: { name: string; color: ColorType }
  onNewFolderChange: (folder: { name: string; color: ColorType }) => void
  onAddFolder: () => void
}

export function Sidebar({
  folders,
  entries,
  selectedFolderId,
  onSelectFolder,
  onDeleteFolder,
  showAddFolder,
  onShowAddFolder,
  newFolder,
  onNewFolderChange,
  onAddFolder,
}: SidebarProps) {
  const { t } = useTranslation()
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const toggleExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const getEntriesForFolder = (folderId: string | null) =>
    entries.filter(e => folderId ? e.folderId === folderId : !e.folderId)

  const rootEntries = getEntriesForFolder(null)

  return (
    <div tw="w-56 min-w-56 border-r-2 border-cpc-green-500 flex flex-col h-full overflow-hidden">
      <div tw="flex-1 overflow-y-auto">
        {/* Root / Unsorted */}
        <SidebarItem
          label={t('vault.unsorted')}
          index={0}
          count={rootEntries.length}
          isSelected={selectedFolderId === null}
          isExpanded={expandedFolders.has('root')}
          onSelect={() => onSelectFolder(null)}
          onToggleExpand={() => toggleExpand('root')}
          entries={rootEntries}
          color="green"
        />

        {/* Folders */}
        {folders.map((folder, index) => {
          const folderEntries = getEntriesForFolder(folder.id)
          return (
            <SidebarItem
              key={folder.id}
              label={folder.name}
              index={index + 1}
              count={folderEntries.length}
              isSelected={selectedFolderId === folder.id}
              isExpanded={expandedFolders.has(folder.id)}
              onSelect={() => onSelectFolder(folder.id)}
              onToggleExpand={() => toggleExpand(folder.id)}
              onDelete={() => onDeleteFolder(folder.id)}
              entries={folderEntries}
              color={folder.color || 'green'}
            />
          )
        })}

        {/* Add folder form */}
        {showAddFolder ? (
          <div tw="p-2">
            <AddFolderForm
              name={newFolder.name}
              color={newFolder.color}
              onNameChange={(name) => onNewFolderChange({ ...newFolder, name })}
              onColorChange={(color) => onNewFolderChange({ ...newFolder, color })}
              onSubmit={onAddFolder}
              onCancel={() => onShowAddFolder(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => onShowAddFolder(true)}
            tw="w-full p-2 text-cpc-green-900 text-xs hover:text-cpc-green-500 hover:bg-cpc-green-500/5 transition-colors flex items-center gap-1"
          >
            <span>+</span>
            <span>{t('folder.new')}</span>
          </button>
        )}
      </div>
    </div>
  )
}

interface SidebarItemProps {
  label: string
  index: number
  count: number
  isSelected: boolean
  isExpanded: boolean
  onSelect: () => void
  onToggleExpand: () => void
  onDelete?: () => void
  entries: PasswordEntry[]
  color: string
}

function SidebarItem({
  label,
  index,
  count,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onDelete,
  entries,
  color,
}: SidebarItemProps) {
  const colors = colorStyles[color as keyof typeof colorStyles] || colorStyles.green

  return (
    <div>
      {/* Folder row */}
      <div
        css={[
          tw`flex items-center gap-1 px-2 py-1.5 cursor-pointer transition-colors text-sm`,
          isSelected ? tw`bg-cpc-green-500/10 border-l-2 border-cpc-green-500` : tw`border-l-2 border-transparent hover:bg-cpc-green-500/5`,
        ]}
      >
        {/* Expand toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand() }}
          tw="text-cpc-green-900 hover:text-cpc-green-500 text-xs w-4 flex-shrink-0"
        >
          {isExpanded ? '▼' : '▶'}
        </button>

        {/* Folder info */}
        <div
          onClick={onSelect}
          tw="flex-1 flex items-center gap-1 min-w-0"
        >
          <span tw="text-cpc-green-500 opacity-50 text-xs flex-shrink-0">[{index}]</span>
          <span css={[tw`truncate font-bold text-xs`, colors.text]}>{label}</span>
          <span tw="text-cpc-green-900 text-xs flex-shrink-0">({count})</span>
        </div>

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            tw="text-cpc-red-500 hover:text-cpc-red-900 text-xs flex-shrink-0 opacity-0 hover:opacity-100"
            css={[isSelected && tw`opacity-60`]}
          >
            ✕
          </button>
        )}
      </div>

      {/* Expanded entries */}
      {isExpanded && entries.length > 0 && (
        <div tw="pl-7">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              tw="text-xs py-0.5 px-2 text-cpc-green-500 opacity-70 truncate"
            >
              <span tw="opacity-50">{i + 1}.</span> {entry.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
