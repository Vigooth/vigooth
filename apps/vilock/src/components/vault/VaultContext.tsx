import { createContext, useContext, useState, ReactNode } from 'react'
import { PasswordEntry } from '../../lib/crypto/vault'
import { ColorType } from '../../types/colors'
import { EntryFormData } from './types'

interface VaultContextValue {
  // Entry expansion
  expandedEntryId: string | null
  toggleEntry: (entryId: string) => void

  // Copy
  copiedField: string | null
  copyField: (text: string, field: string) => void

  // Add entry form
  addingToFolder: string | null
  setAddingToFolder: (folderId: string | null) => void
  entryFormData: EntryFormData
  setEntryFormData: (data: EntryFormData) => void
  submitEntry: (folderId: string | null) => Promise<void>
  cancelEntry: () => void
  generatePassword: () => void

  // Delete
  deleteEntry: (entryId: string) => Promise<void>
  deleteFolder: (folderId: string) => Promise<void>

  // Add
  addNote: (title: string, color: ColorType, folderId?: string) => Promise<string>

  // Update
  updateFolder: (folderId: string, data: Partial<{ name: string; color: ColorType }>) => Promise<void>
  updateNote: (noteId: string, data: Partial<{ title: string; content: string }>) => Promise<void>
  updateEntry: (entryId: string, data: Partial<{ name: string; username: string; password: string; url: string }>) => Promise<void>
}

const VaultContext = createContext<VaultContextValue | null>(null)

interface VaultProviderProps {
  children: ReactNode
  onAddEntry: (folderId: string | null, data: EntryFormData) => Promise<PasswordEntry | undefined>
  onDeleteEntry: (entryId: string) => Promise<void>
  onDeleteFolder: (folderId: string) => Promise<void>
  onAddNote: (title: string, color: ColorType, folderId?: string) => Promise<string>
  onUpdateFolder: (folderId: string, data: Partial<{ name: string; color: ColorType }>) => Promise<void>
  onUpdateNote: (noteId: string, data: Partial<{ title: string; content: string }>) => Promise<void>
  onUpdateEntry: (entryId: string, data: Partial<{ name: string; username: string; password: string; url: string }>) => Promise<void>
  onGeneratePassword: () => string
}

export function VaultProvider({
  children,
  onAddEntry,
  onDeleteEntry,
  onDeleteFolder,
  onAddNote,
  onUpdateFolder,
  onUpdateNote,
  onUpdateEntry,
  onGeneratePassword,
}: VaultProviderProps) {
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [addingToFolder, setAddingToFolder] = useState<string | null>(null)
  const [entryFormData, setEntryFormData] = useState<EntryFormData>({
    name: '',
    username: '',
    password: '',
    url: '',
  })

  const toggleEntry = (entryId: string) => {
    setExpandedEntryId(expandedEntryId === entryId ? null : entryId)
  }

  const copyField = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const submitEntry = async (folderId: string | null) => {
    await onAddEntry(folderId, entryFormData)
    setEntryFormData({ name: '', username: '', password: '', url: '' })
    setAddingToFolder(null)
  }

  const cancelEntry = () => {
    setAddingToFolder(null)
    setEntryFormData({ name: '', username: '', password: '', url: '' })
  }

  const generatePassword = () => {
    const password = onGeneratePassword()
    setEntryFormData(prev => ({ ...prev, password }))
  }

  const deleteEntry = async (entryId: string) => {
    await onDeleteEntry(entryId)
    setExpandedEntryId(null)
  }

  const deleteFolder = async (folderId: string) => {
    await onDeleteFolder(folderId)
  }

  const addNote = async (title: string, color: ColorType, folderId?: string) => {
    return onAddNote(title, color, folderId)
  }

  const updateFolder = async (folderId: string, data: Partial<{ name: string; color: ColorType }>) => {
    await onUpdateFolder(folderId, data)
  }

  const updateNote = async (noteId: string, data: Partial<{ title: string; content: string }>) => {
    await onUpdateNote(noteId, data)
  }

  const updateEntry = async (entryId: string, data: Partial<{ name: string; username: string; password: string; url: string }>) => {
    await onUpdateEntry(entryId, data)
  }

  return (
    <VaultContext.Provider
      value={{
        expandedEntryId,
        toggleEntry,
        copiedField,
        copyField,
        addingToFolder,
        setAddingToFolder,
        entryFormData,
        setEntryFormData,
        submitEntry,
        cancelEntry,
        generatePassword,
        deleteEntry,
        deleteFolder,
        addNote,
        updateFolder,
        updateNote,
        updateEntry,
      }}
    >
      {children}
    </VaultContext.Provider>
  )
}

export function useVault() {
  const context = useContext(VaultContext)
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider')
  }
  return context
}
