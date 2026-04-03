import { useState } from 'react'
import tw from 'twin.macro'
import { useTranslation } from 'react-i18next'
import { Folder, PasswordEntry, Note } from '../../lib/crypto/vault'
import { colorStyles, ColorType } from './types'
import { AddFolderForm } from './AddFolderForm'
import { useSidebar } from './SidebarContext'

interface SidebarProps {
  folders: Folder[]
  entries: PasswordEntry[]
  notes: Note[]
}

export function Sidebar({ folders, entries, notes }: SidebarProps) {
  const { t } = useTranslation()
  const { activeView, selectFolder, addFolder, deleteFolder } = useSidebar()
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [showAddFolder, setShowAddFolder] = useState(false)
  const [newFolder, setNewFolder] = useState({ name: '', color: 'green' as ColorType })

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

  const getNotesForFolder = (folderId: string | null) =>
    (notes ?? []).filter(n => folderId ? n.folderId === folderId : !n.folderId)

  const rootEntries = getEntriesForFolder(null)
  const rootNotes = getNotesForFolder(null)

  return (
    <div tw="w-56 min-w-56 border-r-2 border-cpc-green-500 flex flex-col h-full overflow-hidden">
      <div tw="flex-1 overflow-y-auto">
        {/* === PASSWORDS SECTION === */}
        <div tw="px-2 pt-2 pb-1 flex items-center justify-between">
          <span tw="text-cpc-green-900 text-xs font-bold tracking-wider">{t('sidebar.passwords')}</span>
          <button
            onClick={() => setShowAddFolder(!showAddFolder)}
            tw="text-cpc-green-900 text-xs hover:text-cpc-green-500 transition-colors"
          >
            +
          </button>
        </div>

        {/* Folders */}
        {folders.map((folder, index) => {
          const folderEntries = getEntriesForFolder(folder.id)
          const folderNotes = getNotesForFolder(folder.id)
          return (
            <FolderItem
              key={folder.id}
              label={folder.name}
              index={index + 1}
              count={folderEntries.length}
              isSelected={activeView.type === 'folder' && activeView.folderId === folder.id}
              isExpanded={expandedFolders.has(folder.id)}
              onSelect={() => selectFolder(folder.id)}
              onToggleExpand={() => toggleExpand(folder.id)}
              onDelete={() => deleteFolder(folder.id)}
              entries={folderEntries}
              folderNotes={folderNotes}
              color={folder.color || 'green'}
            />
          )
        })}

        {/* Add folder form */}
        {showAddFolder && (
          <div tw="p-2">
            <AddFolderForm
              name={newFolder.name}
              color={newFolder.color}
              onNameChange={(name) => setNewFolder(prev => ({ ...prev, name }))}
              onColorChange={(color) => setNewFolder(prev => ({ ...prev, color }))}
              onSubmit={() => {
                if (!newFolder.name) return
                addFolder(newFolder.name, newFolder.color)
                setNewFolder({ name: '', color: 'green' })
                setShowAddFolder(false)
              }}
              onCancel={() => {
                setNewFolder({ name: '', color: 'green' })
                setShowAddFolder(false)
              }}
            />
          </div>
        )}

        {/* === TRASH SECTION (unsorted) === */}
        {(rootEntries.length > 0 || rootNotes.length > 0) && (
          <>
            <div tw="px-2 pt-4 pb-1 flex items-center justify-between border-t border-cpc-green-500/20 mt-2">
              <span tw="text-cpc-green-900 text-xs font-bold tracking-wider">{t('sidebar.trash')}</span>
            </div>

            <FolderItem
              label={t('vault.unsorted')}
              index={0}
              count={rootEntries.length}
              isSelected={activeView.type === 'folder' && activeView.folderId === null}
              isExpanded={expandedFolders.has('root')}
              onSelect={() => selectFolder(null)}
              onToggleExpand={() => toggleExpand('root')}
              entries={rootEntries}
              folderNotes={rootNotes}
              color="green"
            />
          </>
        )}
      </div>
    </div>
  )
}

interface FolderItemProps {
  label: string
  index: number
  count: number
  isSelected: boolean
  isExpanded: boolean
  onSelect: () => void
  onToggleExpand: () => void
  onDelete?: () => void
  entries: PasswordEntry[]
  folderNotes: Note[]
  color: string
}

function FolderItem({
  label,
  index,
  count,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onDelete,
  entries,
  folderNotes,
  color,
}: FolderItemProps) {
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

      {/* Expanded entries & notes */}
      {isExpanded && (entries.length > 0 || folderNotes.length > 0) && (
        <div tw="pl-7">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              tw="text-xs py-0.5 px-2 text-cpc-green-500 opacity-70 truncate"
            >
              <span tw="opacity-50">{i + 1}.</span> {entry.name}
            </div>
          ))}
          {folderNotes.map(note => {
            const nc = colorStyles[(note.color as keyof typeof colorStyles) || 'green'] || colorStyles.green
            return (
              <div
                key={note.id}
                css={[tw`text-xs py-0.5 px-2 opacity-70 truncate`, nc.text]}
              >
                ■ {note.title}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

