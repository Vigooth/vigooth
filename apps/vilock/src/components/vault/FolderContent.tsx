import { useState, useRef, useCallback } from 'react'
import tw from 'twin.macro'
import { useTranslation } from 'react-i18next'
import { Folder, PasswordEntry, Note } from '../../lib/crypto/vault'
import { colorStyles } from './types'
import { EntryCard } from './EntryCard'
import { AddEntryForm } from './AddEntryForm'
import { InlineNoteEditor } from './InlineNoteEditor'
import { useVault } from './VaultContext'
import { useSidebar } from './SidebarContext'
import { CpcMenu, CpcMenuItem, CpcMenuSeparator, CpcSubmenu } from '@vigooth/ui'
import { VALID_COLORS } from '../../types/colors'

interface FolderContentProps {
  folder: Folder | null
  entries: PasswordEntry[]
  notes: Note[]
  folderIndex: number
  initialNoteId?: string
}

export function FolderContent({ folder, entries, notes, folderIndex, initialNoteId }: FolderContentProps) {
  const { t } = useTranslation()
  const { addingToFolder, setAddingToFolder, deleteFolder, updateFolder, addNote } = useVault()
  const { deleteNote } = useSidebar()
  const [folderName, setFolderName] = useState(folder?.name ?? '')
  const [activeNoteId, setActiveNoteId] = useState<string | null>(initialNoteId ?? notes[0]?.id ?? null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const activeNote = notes.find(n => n.id === activeNoteId) ?? null
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const colors = folder?.color
    ? colorStyles[folder.color] || colorStyles.green
    : colorStyles.green

  const folderId = folder?.id ?? null
  const isAddingEntry = addingToFolder === (folderId ?? 'root')

  const debouncedSaveName = useCallback(
    (value: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        if (folderId) {
          updateFolder(folderId, { name: value })
        }
      }, 800)
    },
    [folderId, updateFolder],
  )

  const handleNameChange = (value: string) => {
    setFolderName(value)
    debouncedSaveName(value)
  }

  const handleAddClick = () => {
    setAddingToFolder(folderId ?? 'root')
  }

  return (
    <div tw="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      {/* Folder header */}
      <div tw="flex items-center justify-between px-4 py-2 border-b border-cpc-green-500/30 bg-cpc-green-500/10">
        <div tw="flex-1 flex items-center gap-2 mr-4">
          <span tw="text-cpc-green-500 opacity-50 text-sm flex-shrink-0">[{folderIndex}]</span>
          {folder ? (
            <input
              type="text"
              value={folderName}
              onChange={(e) => handleNameChange(e.target.value)}
              css={[tw`w-full bg-transparent font-bold text-sm outline-none border-b border-transparent focus:border-current transition-colors`, colors.text]}
            />
          ) : (
            <span css={[tw`font-bold text-sm`, colors.text]}>
              {t('vault.unsorted')}
            </span>
          )}
          <span tw="text-cpc-green-900 text-xs flex-shrink-0">({entries.length})</span>
        </div>
        <div tw="flex items-center gap-2">
          <CpcMenu
            trigger={
              <button tw="border border-cpc-green-500 text-cpc-green-500 px-2 py-0.5 text-xs hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors cursor-pointer">
                ⋮
              </button>
            }
          >
            <CpcMenuItem onClick={handleAddClick}>{t('menu.add')}</CpcMenuItem>
            <CpcMenuSeparator />
            {folder && (
              <CpcSubmenu label={t('menu.color')}>
                {VALID_COLORS.map((c) => (
                  <CpcMenuItem key={c} onClick={() => updateFolder(folder.id, { color: c })}>
                    <span tw="inline-flex items-center gap-2">
                      <span
                        tw="inline-block w-3 h-3 border border-current"
                        css={[colorStyles[c].bg]}
                      />
                      {c.toUpperCase()}
                    </span>
                  </CpcMenuItem>
                ))}
              </CpcSubmenu>
            )}
            {folder && (
              <CpcMenuItem variant="danger" onClick={() => deleteFolder(folder.id)}>{t('menu.delete')}</CpcMenuItem>
            )}
          </CpcMenu>
        </div>
      </div>

      {/* Note tabs */}
      <div tw="flex items-center gap-0 px-3 pt-2 overflow-x-auto flex-shrink-0">
        {notes.map(note => (
          <NoteTab
            key={note.id}
            note={note}
            isActive={activeNoteId === note.id}
            startEditing={editingNoteId === note.id}
            onSelect={() => setActiveNoteId(note.id)}
            onEditingDone={() => setEditingNoteId(null)}
          />
        ))}
        <button
          onClick={async () => {
            const noteId = await addNote(t('note.untitled'), 'green', folderId ?? undefined)
            setActiveNoteId(noteId)
            setEditingNoteId(noteId)
          }}
          tw="px-3 py-1.5 text-xs text-cpc-green-900 hover:text-cpc-green-500 transition-colors whitespace-nowrap"
          style={{ borderBottom: '2px solid transparent' }}
        >
          +
        </button>
      </div>

      {/* Inline note editor */}
      {activeNote && (
        <InlineNoteEditor
          key={activeNote.id}
          note={activeNote}
          onDelete={() => { setActiveNoteId(null); deleteNote(activeNote.id) }}
        />
      )}

      {/* Entries list — pushed to bottom */}
      <div tw="flex-1 flex flex-col justify-end overflow-y-auto p-3">
        {entries.length === 0 && notes.length === 0 && !isAddingEntry && (
          <div tw="text-center py-8 text-cpc-green-900 text-sm">
            {t('vault.empty.subtitle')}
          </div>
        )}

        <div tw="flex flex-wrap gap-1">
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

interface NoteTabProps {
  note: Note
  isActive: boolean
  startEditing?: boolean
  onSelect: () => void
  onEditingDone?: () => void
}

function NoteTab({ note, isActive, startEditing: startEditingProp, onSelect, onEditingDone }: NoteTabProps) {
  const { updateNote } = useVault()
  const [editing, setEditing] = useState(startEditingProp ?? false)
  const [title, setTitle] = useState(note.title)
  const tabRef = useRef<HTMLButtonElement>(null)
  const [tabWidth, setTabWidth] = useState<number | undefined>(undefined)
  const nc = colorStyles[(note.color as keyof typeof colorStyles) || 'green'] || colorStyles.green

  const handleSubmit = () => {
    if (title.trim()) {
      updateNote(note.id, { title: title.trim() })
    } else {
      setTitle(note.title)
    }
    setEditing(false)
    setTabWidth(undefined)
    onEditingDone?.()
  }

  const startEditing = () => {
    if (tabRef.current) {
      setTabWidth(tabRef.current.offsetWidth)
    }
    setEditing(true)
  }

  if (editing) {
    return (
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') { setTitle(note.title); setEditing(false); setTabWidth(undefined) }
        }}
        css={[
          tw`px-3 py-1.5 text-xs font-bold bg-transparent outline-none`,
          nc.text,
        ]}
        style={{
          borderBottom: '2px solid currentColor',
          minWidth: tabWidth,
        }}
        autoFocus
      />
    )
  }

  return (
    <button
      ref={tabRef}
      onClick={onSelect}
      onDoubleClick={startEditing}
      css={[
        tw`flex items-center gap-1 px-3 py-1.5 text-xs font-bold whitespace-nowrap cursor-pointer`,
        isActive && nc.text,
        !isActive && tw`text-cpc-green-900 hover:bg-cpc-green-500/5`,
      ]}
      style={{
        borderBottom: isActive ? '2px solid currentColor' : '2px solid transparent',
      }}
    >
      {note.title}
    </button>
  )
}
