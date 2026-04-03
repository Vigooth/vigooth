import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CpcLayout } from '@vigooth/ui'
import 'twin.macro'
import { useAuth } from '../../stores/auth'
import {
  generatePassword,
  generateId,
  Folder,
} from '../../lib/crypto/vault'
import { Terminal, CommandContext } from '../../components/terminal'
import {
  Sidebar,
  SidebarProvider,
  FolderContent,
  NoteEditor,
  VaultProvider,
  EntryFormData,
} from '../../components/vault'
import type { SidebarView } from '../../components/vault/SidebarContext'
import { ColorType } from '@/types/colors'
import {
  useVaultQuery,
  useAddFolder,
  useDeleteFolder,
  useUpdateFolder,
  useAddEntry,
  useDeleteEntry,
  useUpdateEntry,
  useMoveEntries,
  useAddNote,
  useUpdateNote,
  useDeleteNote,
} from '@/hooks/useVaultQuery'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSync } from '@/hooks/useSync'

export function VaultPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { masterPassword, clearMasterPassword, logout } = useAuth()

  // Active view in sidebar (folder or note)
  const [activeView, setActiveView] = useState<SidebarView>({ type: 'folder', folderId: null })

  // Terminal state
  const [currentFolder, setCurrentFolder] = useState<{ id: string; name: string } | null>(null)

  // Online status
  const isOnline = useOnlineStatus()

  // Sync management
  const { isSyncing, hasPending } = useSync({ masterPassword })

  // React Query hooks
  const {
    data: vaultData,
    isLoading: loading,
    isError,
  } = useVaultQuery({
    masterPassword,
    onAuthError: () => {
      clearMasterPassword()
      navigate('/unlock')
    },
  })

  const vault = vaultData?.vault ?? null

  const addFolderMutation = useAddFolder({ masterPassword })
  const deleteFolderMutation = useDeleteFolder({ masterPassword })
  const updateFolderMutation = useUpdateFolder({ masterPassword })
  const addEntryMutation = useAddEntry({ masterPassword })
  const deleteEntryMutation = useDeleteEntry({ masterPassword })
  const updateEntryMutation = useUpdateEntry({ masterPassword })
  const moveEntriesMutation = useMoveEntries({ masterPassword })
  const addNoteMutation = useAddNote({ masterPassword })
  const updateNoteMutation = useUpdateNote({ masterPassword })
  const deleteNoteMutation = useDeleteNote({ masterPassword })

  const saving =
    addFolderMutation.isPending ||
    deleteFolderMutation.isPending ||
    updateFolderMutation.isPending ||
    addEntryMutation.isPending ||
    deleteEntryMutation.isPending ||
    updateEntryMutation.isPending ||
    moveEntriesMutation.isPending ||
    addNoteMutation.isPending ||
    updateNoteMutation.isPending ||
    deleteNoteMutation.isPending

  const handleLock = () => {
    clearMasterPassword()
    navigate('/unlock')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleAddFolder = async (name: string, color: ColorType) => {
    await addFolderMutation.mutateAsync({ name, color })
  }

  const handleUpdateFolder = useCallback(async (folderId: string, data: Partial<{ name: string; color: ColorType }>) => {
    await updateFolderMutation.mutateAsync({ folderId, data })
  }, [updateFolderMutation])

  const handleDeleteFolder = async (folderId: string) => {
    if (activeView.type === 'folder' && activeView.folderId === folderId) {
      setActiveView({ type: 'folder', folderId: null })
    }
    await deleteFolderMutation.mutateAsync(folderId)
  }

  const handleAddEntry = async (folderId: string | null, data: EntryFormData) => {
    if (!data.name) return

    const result = await addEntryMutation.mutateAsync({ folderId, data })
    return result.entry
  }

  const handleDeleteEntry = async (id: string) => {
    await deleteEntryMutation.mutateAsync(id)
  }

  const handleGeneratePassword = () => generatePassword(20)

  // Add folder (for terminal)
  const addFolderToVault = async (folder: Folder) => {
    await addFolderMutation.mutateAsync({
      name: folder.name,
      color: folder.color || 'green',
    })
  }

  // Update entry (for terminal)
  const handleUpdateEntry = async (entryId: string, data: Partial<{ name: string; username: string; password: string; url: string }>) => {
    await updateEntryMutation.mutateAsync({ entryId, data })
  }

  // Move entries (for terminal) - batch update
  const handleMoveEntries = async (entryIds: string[], targetFolderId: string | null) => {
    await moveEntriesMutation.mutateAsync({ entryIds, targetFolderId })
  }

  // Notes handlers
  const handleAddNote = async (title: string, color: ColorType, folderId?: string) => {
    const result = await addNoteMutation.mutateAsync({ title, color, folderId })
    setActiveView({ type: 'note', noteId: result.note.id })
  }

  const handleUpdateNote = useCallback(async (noteId: string, data: Partial<{ title: string; content: string }>) => {
    await updateNoteMutation.mutateAsync({ noteId, data })
  }, [updateNoteMutation])

  const handleDeleteNote = async (noteId: string) => {
    if (activeView.type === 'note' && activeView.noteId === noteId) {
      setActiveView({ type: 'folder', folderId: null })
    }
    await deleteNoteMutation.mutateAsync(noteId)
  }

  // Terminal context
  const terminalContext: CommandContext = useMemo(() => ({
    vault,
    currentFolder,
    setCurrentFolder,
    addEntry: handleAddEntry,
    addFolder: addFolderToVault,
    removeFolder: handleDeleteFolder,
    removeEntry: handleDeleteEntry,
    moveEntries: handleMoveEntries,
    updateEntry: handleUpdateEntry,
    generatePassword,
    generateId,
  }), [vault, currentFolder, handleAddEntry, addFolderToVault, handleDeleteFolder, handleDeleteEntry, handleMoveEntries, handleUpdateEntry])

  const getEntriesForFolder = (folderId: string | null) =>
    vault?.entries.filter(e => folderId ? e.folderId === folderId : !e.folderId) || []

  // Current selected folder/note
  const selectedFolder = activeView.type === 'folder' && activeView.folderId
    ? vault?.folders.find(f => f.id === activeView.folderId) ?? null
    : null
  const selectedFolderIndex = activeView.type === 'folder' && activeView.folderId
    ? (vault?.folders.findIndex(f => f.id === activeView.folderId) ?? -1) + 1
    : 0
  const selectedEntries = activeView.type === 'folder'
    ? getEntriesForFolder(activeView.folderId)
    : []
  const selectedNotes = activeView.type === 'folder'
    ? (vault?.notes ?? []).filter(n => activeView.folderId ? n.folderId === activeView.folderId : !n.folderId)
    : []
  const selectedNote = activeView.type === 'note'
    ? (vault?.notes ?? []).find(n => n.id === activeView.noteId) ?? null
    : null

  if (loading) {
    return (
      <CpcLayout>
        <div tw="h-full flex items-center justify-center">
          <div tw="text-cpc-green-500">{t('vault.loading')}</div>
        </div>
      </CpcLayout>
    )
  }

  if (isError) {
    clearMasterPassword()
    navigate('/unlock')
    return null
  }

  return (
    <VaultProvider
      onAddEntry={handleAddEntry}
      onDeleteEntry={handleDeleteEntry}
      onDeleteFolder={handleDeleteFolder}
      onAddNote={async (title, color, folderId) => {
        const result = await addNoteMutation.mutateAsync({ title, color, folderId })
        return result.note.id
      }}
      onUpdateFolder={handleUpdateFolder}
      onUpdateNote={handleUpdateNote}
      onUpdateEntry={handleUpdateEntry}
      onGeneratePassword={handleGeneratePassword}
    >
      <SidebarProvider
        activeView={activeView}
        onSelectFolder={(folderId) => setActiveView({ type: 'folder', folderId })}
        onSelectNote={(noteId, folderId) => {
          if (folderId !== undefined) {
            setActiveView({ type: 'folder', folderId, activeNoteId: noteId })
          } else {
            setActiveView({ type: 'note', noteId })
          }
        }}
        onAddFolder={handleAddFolder}
        onDeleteFolder={handleDeleteFolder}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
      >
        <CpcLayout>
          <div tw="h-full flex flex-col">
            {/* Header */}
            <div tw="flex justify-between items-center p-3 border-b-2 border-cpc-green-500">
              <div tw="flex items-center gap-2">
                <span tw="text-cpc-red-500 font-bold">{t('app.name')}</span>
                {saving && <span tw="text-cpc-yellow-500 text-xs">{t('vault.saving')}</span>}
                {isSyncing && <span tw="text-cpc-cyan-500 text-xs animate-pulse">{t('status.syncing')}</span>}
                {!isOnline && <span tw="text-cpc-red-500 text-xs animate-pulse">{t('status.offline')}</span>}
                {isOnline && hasPending && !isSyncing && (
                  <span tw="text-cpc-yellow-500 text-xs">{t('status.pending')}</span>
                )}
              </div>
              <div tw="flex gap-2">
                <button
                  onClick={handleLock}
                  tw="border-2 border-cpc-yellow-500 text-cpc-yellow-500 px-3 py-1 hover:bg-cpc-yellow-500 hover:text-cpc-grey-900 transition-colors text-xs"
                >
                  {t('auth.lock')}
                </button>
                <button
                  onClick={handleLogout}
                  tw="border-2 border-cpc-red-500 text-cpc-red-500 px-3 py-1 hover:bg-cpc-red-500 hover:text-cpc-grey-900 transition-colors text-xs"
                >
                  {t('auth.logout')}
                </button>
              </div>
            </div>

            {/* Sidebar + Content */}
            <div tw="flex-1 flex overflow-hidden">
              <Sidebar
                folders={vault?.folders ?? []}
                entries={vault?.entries ?? []}
                notes={vault?.notes ?? []}
              />

              {activeView.type === 'folder' ? (
                <FolderContent
                  key={`${selectedFolder?.id ?? 'root'}-${activeView.activeNoteId ?? ''}`}
                  folder={selectedFolder}
                  entries={selectedEntries}
                  notes={selectedNotes}
                  folderIndex={selectedFolderIndex}
                  initialNoteId={activeView.activeNoteId}
                />
              ) : selectedNote ? (
                <NoteEditor
                  key={selectedNote.id}
                  note={selectedNote}
                  onUpdateNote={handleUpdateNote}
                  onDeleteNote={handleDeleteNote}
                />
              ) : null}
            </div>

            <Terminal context={terminalContext} />
          </div>
        </CpcLayout>
      </SidebarProvider>
    </VaultProvider>
  )
}
