import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CpcLayout } from '@vigooth/ui'
import 'twin.macro'
import { useAuth } from '../../stores/auth'
import {
  generatePassword,
  generateId,
  PasswordEntry,
  Folder,
} from '../../lib/crypto/vault'
import { Terminal, CommandContext } from '../../components/terminal'
import {
  FolderCard,
  AddFolderForm,
  AddEntryForm,
  EntryCard,
  VaultProvider,
  useVault,
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
  }), [vault, currentFolder])

  const getEntriesForFolder = (folderId: string | null) =>
    vault?.entries.filter(e => folderId ? e.folderId === folderId : !e.folderId) || []

  const rootEntries = getEntriesForFolder(null)

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

          {/* Content */}
          <div tw="flex-1 overflow-auto p-3">
            <div tw="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {vault?.folders.map((folder, index) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  entries={getEntriesForFolder(folder.id)}
                  index={index + 1}
                />
              ))}

              <RootEntriesCard entries={rootEntries} />

              {showAddFolder ? (
                <AddFolderForm
                  name={newFolder.name}
                  color={newFolder.color}
                  onNameChange={(name) => setNewFolder(prev => ({ ...prev, name }))}
                  onColorChange={(color) => setNewFolder(prev => ({ ...prev, color }))}
                  onSubmit={handleAddFolder}
                  onCancel={() => setShowAddFolder(false)}
                />
              ) : (
                <button
                  onClick={() => setShowAddFolder(true)}
                  tw="border-2 border-dashed border-cpc-green-900 text-cpc-green-900 p-3 flex items-center justify-center gap-2 hover:border-cpc-green-500 hover:text-cpc-green-500 transition-colors min-h-[120px]"
                >
                  <span tw="text-2xl">+</span>
                  <span tw="text-sm">{t('folder.new')}</span>
                </button>
              )}
            </div>

            {vault?.folders.length === 0 && rootEntries.length === 0 && !showAddFolder && (
              <div tw="text-center py-12 text-cpc-green-900">
                <div tw="text-lg mb-2">{t('vault.empty.title')}</div>
                <div tw="text-sm">{t('vault.empty.subtitle')}</div>
              </div>
            )}
          </div>

          <Terminal context={terminalContext} />
        </div>
      </CpcLayout>
    </VaultProvider>
  )
}

// Root entries card component
function RootEntriesCard({ entries }: { entries: PasswordEntry[] }) {
  const { t } = useTranslation()
  const { addingToFolder, setAddingToFolder } = useVault()

  if (entries.length === 0 && addingToFolder !== 'root') {
    return null
  }

  return (
    <div tw="border-2 border-cpc-green-500 p-3">
      <div tw="flex justify-between items-center mb-3">
        <div
          onClick={() => addingToFolder !== 'root' && setAddingToFolder('root')}
          tw="text-cpc-green-500 font-bold flex items-center gap-2 cursor-pointer hover:opacity-80"
        >
          <span tw="opacity-60">[0]</span>
          <span>📁</span>
          <span>{t('vault.unsorted')}</span>
          <span tw="text-xs opacity-60">({entries.length})</span>
        </div>
      </div>

      <div tw="space-y-2">
        {entries.map((entry, index) => (
          <EntryCard key={entry.id} entry={entry} index={index + 1} />
        ))}

        {addingToFolder === 'root' && <AddEntryForm folderId={null} />}
      </div>
    </div>
  )
}
