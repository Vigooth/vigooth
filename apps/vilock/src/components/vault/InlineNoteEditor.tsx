import { useState, useRef, useCallback } from 'react'
import tw from 'twin.macro'
import { useTranslation } from 'react-i18next'
import { Note } from '../../lib/crypto/vault'
import { useVault } from './VaultContext'

interface InlineNoteEditorProps {
  note: Note
  onDelete: () => void
}

export function InlineNoteEditor({ note, onDelete }: InlineNoteEditorProps) {
  const { t } = useTranslation()
  const { updateNote } = useVault()
  const [content, setContent] = useState(note.content)
  const [height, setHeight] = useState(350)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null)

  const debouncedSave = useCallback(
    (value: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        updateNote(note.id, { content: value })
      }, 800)
    },
    [note.id, updateNote],
  )

  const handleContentChange = (value: string) => {
    setContent(value)
    debouncedSave(value)
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startHeight: height }

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const delta = e.clientY - dragRef.current.startY
      setHeight(Math.max(100, dragRef.current.startHeight + delta))
    }

    const handleMouseUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [height])

  return (
    <div tw="flex flex-col" style={{ height, flexShrink: 0 }}>
      <div tw="flex items-center justify-end px-4 py-1">
        <button
          onClick={onDelete}
          tw="text-cpc-red-500 hover:text-cpc-red-900 text-xs"
        >
          ✕
        </button>
      </div>
      <div tw="flex-1 overflow-hidden min-h-0">
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          tw="w-full h-full bg-transparent text-cpc-green-500 text-xs p-4 pt-0 outline-none resize-none font-mono"
          placeholder={t('note.contentPlaceholder')}
          spellCheck={false}
        />
      </div>
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        css={[tw`h-1.5 cursor-row-resize border-b border-cpc-green-500/30 flex items-center justify-center hover:bg-cpc-green-500/10 transition-colors`]}
      >
        <div tw="w-8 h-0.5 bg-cpc-green-500/30 rounded" />
      </div>
    </div>
  )
}
