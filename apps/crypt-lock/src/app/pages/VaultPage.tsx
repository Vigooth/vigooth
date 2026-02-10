import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CpcLayout } from '@vigooth/ui'
import 'twin.macro'
import { useAuth } from '../../stores/auth'
import { getVault, saveVault } from '../../lib/api/client'
import {
  decryptVault,
  encryptVault,
  createEmptyVault,
  generatePassword,
  generateId,
  PasswordEntry,
  Folder,
  VaultData,
} from '../../lib/crypto/vault'
import { Terminal, CommandContext } from '../../components/terminal'
import {
  FolderCard,
  AddFolderForm,
  AddEntryForm,
  EntryCard,
  VaultProvider,
  useVault,
  ColorType,
  EntryFormData,
} from '../../components/vault'

export function VaultPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { masterPassword, clearMasterPassword, logout } = useAuth()
  const [vault, setVault] = useState<VaultData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddFolder, setShowAddFolder] = useState(false)
  const [newFolder, setNewFolder] = useState({ name: '', color: 'green' as ColorType })

  // Terminal state
  const [currentFolder, setCurrentFolder] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    if (!masterPassword) {
      navigate('/unlock')
      return
    }
    loadVault()
  }, [masterPassword])

  const loadVault = async () => {
    if (!masterPassword) return

    try {
      const response = await getVault()
      const decrypted = await decryptVault(response.data, masterPassword)
      if (!decrypted.folders) {
        decrypted.folders = []
      }
      setVault(decrypted)
    } catch (err) {
      if (err instanceof Error && err.message === 'vault not found') {
        setVault(createEmptyVault())
      } else {
        clearMasterPassword()
        navigate('/unlock')
      }
    } finally {
      setLoading(false)
    }
  }

  const saveVaultToServer = async (updatedVault: VaultData) => {
    if (!masterPassword) return

    setSaving(true)
    try {
      const encrypted = await encryptVault(updatedVault, masterPassword)
      await saveVault(encrypted)
      setVault(updatedVault)
    } catch (err) {
      console.error('Failed to save vault:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleLock = () => {
    clearMasterPassword()
    navigate('/unlock')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleAddFolder = async () => {
    if (!vault || !newFolder.name) return

    const folder: Folder = {
      id: generateId(),
      name: newFolder.name.toUpperCase(),
      color: newFolder.color,
      createdAt: new Date().toISOString(),
    }

    await saveVaultToServer({
      ...vault,
      folders: [...vault.folders, folder],
    })
    setNewFolder({ name: '', color: 'green' })
    setShowAddFolder(false)
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!vault) return

    const updatedEntries = vault.entries.map(e =>
      e.folderId === folderId ? { ...e, folderId: undefined } : e
    )

    await saveVaultToServer({
      ...vault,
      folders: vault.folders.filter(f => f.id !== folderId),
      entries: updatedEntries,
    })
  }

  const handleAddEntry = async (folderId: string | null, data: EntryFormData) => {
    if (!vault || !data.name) return

    const entry: PasswordEntry = {
      id: generateId(),
      folderId: folderId || undefined,
      name: data.name,
      username: data.username || '',
      password: data.password || '',
      url: data.url || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await saveVaultToServer({
      ...vault,
      entries: [...vault.entries, entry],
    })
    return entry
  }

  const handleDeleteEntry = async (id: string) => {
    if (!vault) return

    await saveVaultToServer({
      ...vault,
      entries: vault.entries.filter(e => e.id !== id),
    })
  }

  const handleGeneratePassword = () => generatePassword(20)

  // Add folder (for terminal)
  const addFolderToVault = async (folder: Folder) => {
    if (!vault) return
    await saveVaultToServer({
      ...vault,
      folders: [...vault.folders, folder],
    })
  }

  // Terminal context
  const terminalContext: CommandContext = useMemo(() => ({
    vault,
    currentFolder,
    setCurrentFolder,
    addEntry: handleAddEntry,
    addFolder: addFolderToVault,
    removeFolder: handleDeleteFolder,
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
            <div>
              <span tw="text-cpc-red-500 font-bold">{t('app.name')}</span>
              {saving && <span tw="text-cpc-yellow-500 ml-2 text-xs">{t('vault.saving')}</span>}
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
              {vault?.folders.map(folder => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  entries={getEntriesForFolder(folder.id)}
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
          <span>📁</span>
          <span>{t('vault.unsorted')}</span>
          <span tw="text-xs opacity-60">({entries.length})</span>
        </div>
      </div>

      <div tw="space-y-2">
        {entries.map(entry => (
          <EntryCard key={entry.id} entry={entry} />
        ))}

        {addingToFolder === 'root' && <AddEntryForm folderId={null} />}
      </div>
    </div>
  )
}
