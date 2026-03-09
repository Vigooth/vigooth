import { createContext, useContext, useState, ReactNode } from 'react'
import { PasswordEntry } from '../../lib/crypto/vault'
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
}

const VaultContext = createContext<VaultContextValue | null>(null)

interface VaultProviderProps {
  children: ReactNode
  onAddEntry: (folderId: string | null, data: EntryFormData) => Promise<PasswordEntry | undefined>
  onDeleteEntry: (entryId: string) => Promise<void>
  onDeleteFolder: (folderId: string) => Promise<void>
  onGeneratePassword: () => string
}

export function VaultProvider({
  children,
  onAddEntry,
  onDeleteEntry,
  onDeleteFolder,
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
