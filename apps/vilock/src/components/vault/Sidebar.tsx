import { useState } from 'react'
import { cn } from '@vigooth/ui'
import { useTranslation } from 'react-i18next'
import { Folder, PasswordEntry, Note } from '../../lib/crypto/vault'
import { colorStyles, ColorType } from './types'
import { AddFolderForm } from './AddFolderForm'
import { useSidebar } from './SidebarContext'
import { useVault } from './VaultContext'
import { CpcMenu, CpcMenuItem, CpcMenuSeparator, CpcSubmenu } from '@vigooth/ui'

interface SidebarProps {
  folders: Folder[]
  entries: PasswordEntry[]
  notes: Note[]
  onNavigate?: () => void
}

export function Sidebar({ folders, entries, notes, onNavigate }: SidebarProps) {
  const { t } = useTranslation()
  const { activeView, selectFolder, selectNote, addFolder, deleteFolder } = useSidebar()
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
    <div className="w-56 min-w-56 md:border-r-2 border-cpc-green-500 flex flex-col h-full overflow-hidden max-md:w-full max-md:min-w-0">
      <div className="flex-1 overflow-y-auto">
        {/* === PASSWORDS SECTION === */}
        <div className="px-2 pt-2 pb-1 flex items-center justify-between">
          <span className="text-cpc-green-900 text-xs font-bold tracking-wider">{t('sidebar.passwords')}</span>
          <button
            onClick={() => setShowAddFolder(!showAddFolder)}
            className="text-cpc-green-900 text-xs hover:text-cpc-green-500 transition-colors"
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
              onSelect={() => { selectFolder(folder.id); onNavigate?.() }}
              onToggleExpand={() => toggleExpand(folder.id)}
              onDelete={() => deleteFolder(folder.id)}
              onSelectNote={(noteId) => { selectNote(noteId, folder.id); onNavigate?.() }}
              entries={folderEntries}
              folderNotes={folderNotes}
              color={folder.color || 'green'}
            />
          )
        })}

        {/* Add folder form */}
        {showAddFolder && (
          <div className="p-2">
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
            <div className="px-2 pt-4 pb-1 flex items-center justify-between border-t border-cpc-green-500/20 mt-2">
              <span className="text-cpc-green-900 text-xs font-bold tracking-wider">{t('sidebar.trash')}</span>
            </div>

            <FolderItem
              label={t('vault.unsorted')}
              index={0}
              count={rootEntries.length}
              isSelected={activeView.type === 'folder' && activeView.folderId === null}
              isExpanded={expandedFolders.has('root')}
              onSelect={() => { selectFolder(null); onNavigate?.() }}
              onToggleExpand={() => toggleExpand('root')}
              onSelectNote={(noteId) => { selectNote(noteId, null); onNavigate?.() }}
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
  onSelectNote?: (noteId: string) => void
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
  onSelectNote,
  entries,
  folderNotes,
  color,
}: FolderItemProps) {
  const colors = colorStyles[color as keyof typeof colorStyles] || colorStyles.green

  const handleFolderClick = () => {
    if (isSelected) {
      onToggleExpand()
    } else {
      onSelect()
      if (!isExpanded) onToggleExpand()
    }
  }

  return (
    <div>
      {/* Folder row */}
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 cursor-pointer transition-colors text-sm",
          isSelected ? "bg-cpc-green-500/10 border-l-2 border-cpc-green-500" : "border-l-2 border-transparent hover:bg-cpc-green-500/5",
        )}
      >
        {/* Expand toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand() }}
          className="text-cpc-green-900 hover:text-cpc-green-500 text-xs w-4 flex-shrink-0"
        >
          {isExpanded ? '▼' : '▶'}
        </button>

        {/* Folder info */}
        <div
          onClick={handleFolderClick}
          className="flex-1 flex items-center gap-1 min-w-0"
        >
          <span className="text-cpc-green-500 opacity-50 text-xs flex-shrink-0">[{index}]</span>
          <span className={cn("truncate font-bold text-xs", colors.text)}>{label}</span>
          <span className="text-cpc-green-900 text-xs flex-shrink-0">({count})</span>
        </div>

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className={cn(
              "text-cpc-red-500 hover:text-cpc-red-900 text-xs flex-shrink-0 opacity-0 hover:opacity-100",
              isSelected && "opacity-60",
            )}
          >
            ✕
          </button>
        )}
      </div>

      {/* Expanded entries & notes */}
      {isExpanded && (entries.length > 0 || folderNotes.length > 0) && (
        <div className="pl-7">
          {entries.map((entry, i) => (
            <EntryItem key={entry.id} entry={entry} index={i + 1} />
          ))}
          {folderNotes.map(note => {
            const nc = colorStyles[(note.color as keyof typeof colorStyles) || 'green'] || colorStyles.green
            return (
              <div
                key={note.id}
                onClick={() => onSelectNote?.(note.id)}
                className={cn("text-xs py-0.5 px-2 opacity-70 truncate cursor-pointer hover:opacity-100 transition-opacity", nc.text)}
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

const inputClassName = "w-full bg-transparent border border-cpc-green-500/40 text-cpc-green-500 text-xs px-2 py-1 outline-none focus:border-cpc-green-500"

function EntryItem({ entry, index }: { entry: PasswordEntry; index: number }) {
  const { t } = useTranslation()
  const { copyField, deleteEntry, updateEntry } = useVault()
  const [form, setForm] = useState({ name: entry.name, username: entry.username, password: entry.password, url: entry.url ?? '' })

  const handleSave = async () => {
    await updateEntry(entry.id, form)
  }

  return (
    <CpcMenu
      trigger={
        <div className="text-xs py-0.5 px-2 text-cpc-green-500 opacity-70 truncate cursor-pointer hover:opacity-100 transition-opacity">
          <span className="opacity-50">{index}.</span> {entry.name}
        </div>
      }
    >
      <CpcMenuItem onClick={() => copyField(entry.password, `pass-${entry.id}`)}>{t('menu.copyPassword')}</CpcMenuItem>
      <CpcMenuItem onClick={() => copyField(entry.username, `user-${entry.id}`)}>{t('menu.copyUser')}</CpcMenuItem>
      {entry.url && (
        <>
          <CpcMenuSeparator />
          <CpcMenuItem onClick={() => window.open(entry.url, '_blank')}>{t('menu.website')}</CpcMenuItem>
        </>
      )}
      <CpcMenuSeparator />
      <CpcSubmenu label={t('menu.edit')}>
        <div className="p-2 space-y-2 w-48" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
          <input className={inputClassName} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('entry.name')} />
          <input className={inputClassName} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder={t('entry.username')} />
          <input className={inputClassName} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={t('entry.password')} />
          <input className={inputClassName} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder={t('entry.url')} />
          <button
            onClick={handleSave}
            className="w-full border border-cpc-green-500 text-cpc-green-500 text-xs py-1 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors cursor-pointer"
          >
            {t('menu.edit.save')}
          </button>
        </div>
      </CpcSubmenu>
      <CpcMenuItem variant="danger" onClick={() => deleteEntry(entry.id)}>{t('menu.delete')}</CpcMenuItem>
    </CpcMenu>
  )
}
