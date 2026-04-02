import { useState, useMemo } from 'react'
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
  FolderContent,
  VaultProvider,
  EntryFormData,
} from '../../components/vault'
import { ColorType } from '@/types/colors'
import {
  useVaultQuery,
  useAddFolder,
  useDeleteFolder,
  useAddEntry,
  useDeleteEntry,
  useUpdateEntry,
  useMoveEntries,
} from '@/hooks/useVaultQuery'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSync } from '@/hooks/useSync'

export function VaultPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { masterPassword, clearMasterPassword, logout } = useAuth()
  const [showAddFolder, setShowAddFolder] = useState(false)
  const [newFolder, setNewFolder] = useState({ name: '', color: 'green' as ColorType })

  // Selected folder in sidebar (null = root/unsorted)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)

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
  const addEntryMutation = useAddEntry({ masterPassword })
  const deleteEntryMutation = useDeleteEntry({ masterPassword })
  const updateEntryMutation = useUpdateEntry({ masterPassword })
  const moveEntriesMutation = useMoveEntries({ masterPassword })

  const saving =
    addFolderMutation.isPending ||
    deleteFolderMutation.isPending ||
    addEntryMutation.isPending ||
    deleteEntryMutation.isPending ||
    updateEntryMutation.isPending ||
    moveEntriesMutation.isPending

  const handleLock = () => {
    clearMasterPassword()
    navigate('/unlock')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleAddFolder = async () => {
    if (!newFolder.name) return

    await addFolderMutation.mutateAsync({
      name: newFolder.name,
      color: newFolder.color,
    })
    setNewFolder({ name: '', color: 'green' })
    setShowAddFolder(false)
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (selectedFolderId === folderId) {
      setSelectedFolderId(null)
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

  // Current selected folder object
  const selectedFolder = selectedFolderId
    ? vault?.folders.find(f => f.id === selectedFolderId) ?? null
    : null
  const selectedFolderIndex = selectedFolderId
    ? (vault?.folders.findIndex(f => f.id === selectedFolderId) ?? -1) + 1
    : 0
  const selectedEntries = getEntriesForFolder(selectedFolderId)

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
      onGeneratePassword={handleGeneratePassword}
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
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              onDeleteFolder={handleDeleteFolder}
              showAddFolder={showAddFolder}
              onShowAddFolder={setShowAddFolder}
              newFolder={newFolder}
              onNewFolderChange={setNewFolder}
              onAddFolder={handleAddFolder}
            />

            <FolderContent
              folder={selectedFolder}
              entries={selectedEntries}
              folderIndex={selectedFolderIndex}
            />
          </div>

          <Terminal context={terminalContext} />
        </div>
      </CpcLayout>
    </VaultProvider>
  )
}
