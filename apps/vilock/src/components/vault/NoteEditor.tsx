import { useState, useRef, useCallback } from 'react'
import 'twin.macro'
import { useTranslation } from 'react-i18next'
import { Note } from '../../lib/crypto/vault'

interface NoteEditorProps {
  note: Note
  onUpdateNote: (noteId: string, data: Partial<{ title: string; content: string }>) => Promise<void>
  onDeleteNote: (noteId: string) => Promise<void>
}

// Use key={note.id} on this component to reset state when switching notes
export function NoteEditor({ note, onUpdateNote, onDeleteNote }: NoteEditorProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedSave = useCallback(
    (field: 'title' | 'content', value: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        onUpdateNote(note.id, { [field]: value })
      }, 800)
    },
    [note.id, onUpdateNote],
  )

  const handleTitleChange = (value: string) => {
    setTitle(value)
    debouncedSave('title', value)
  }

  const handleContentChange = (value: string) => {
    setContent(value)
    debouncedSave('content', value)
  }

  const updatedAt = new Date(note.updatedAt)
  const formattedDate = updatedAt.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div tw="flex-1 flex flex-col h-full overflow-hidden">
      {/* Note header */}
      <div tw="flex items-center justify-between px-4 py-2 border-b border-cpc-green-500/30">
        <div tw="flex-1 mr-4">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            tw="w-full bg-transparent text-cpc-yellow-500 font-bold text-sm outline-none border-b border-transparent focus:border-cpc-yellow-500 transition-colors"
            placeholder={t('note.titlePlaceholder')}
          />
        </div>
        <div tw="flex items-center gap-3">
          <span tw="text-cpc-green-900 text-xs">{formattedDate}</span>
          <button
            onClick={() => onDeleteNote(note.id)}
            tw="text-cpc-red-500 hover:text-cpc-red-900 text-xs"
          >
            {t('entry.delete')}
          </button>
        </div>
      </div>

      {/* Text editor */}
      <div tw="flex-1 overflow-hidden">
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          tw="w-full h-full bg-transparent text-cpc-green-500 text-sm p-4 outline-none resize-none font-mono"
          placeholder={t('note.contentPlaceholder')}
          spellCheck={false}
        />
      </div>
    </div>
  )
}
