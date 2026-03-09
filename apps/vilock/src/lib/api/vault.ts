import { getVault, saveVault as saveVaultApi, VaultResponse } from './client'
import {
  decryptVault,
  encryptVault,
  createEmptyVault,
  VaultData,
} from '../crypto/vault'
import {
  saveEncryptedVaultToCache,
  loadEncryptedVaultFromCache,
  markPendingSync,
  markSyncComplete,
  hasPendingSync,
} from '../storage'

export interface VaultApiResult {
  vault: VaultData
  updatedAt: string | null
  hasPendingSync: boolean
}

/**
 * Fetch and decrypt vault
 * - Online: fetch from server, cache encrypted locally
 * - Offline: load from encrypted cache
 *
 * Decrypted data only lives in memory (React Query cache)
 * Encrypted data is persisted in IndexedDB
 */
export async function fetchVault(masterPassword: string): Promise<VaultApiResult> {
  let encryptedData: string | null = null
  let updatedAt: string | null = null
  const pendingSync = await hasPendingSync()

  // Try to fetch from server first
  if (navigator.onLine) {
    try {
      const response: VaultResponse = await getVault()
      encryptedData = response.data
      updatedAt = response.updated_at

      // Cache encrypted data locally for offline use
      await saveEncryptedVaultToCache(encryptedData)
    } catch (err) {
      if (err instanceof Error && err.message === 'vault not found') {
        // New user, create empty vault
        const emptyVault = createEmptyVault()
        return {
          vault: emptyVault,
          updatedAt: null,
          hasPendingSync: false,
        }
      }
      // Network error - try offline cache
      console.warn('Failed to fetch from server, trying offline cache:', err)
    }
  }

  // If no data from server, try offline cache
  if (!encryptedData) {
    const cached = await loadEncryptedVaultFromCache()
    if (cached) {
      encryptedData = cached.data
      updatedAt = cached.updatedAt
    } else {
      // No cache and no server - return empty vault
      return {
        vault: createEmptyVault(),
        updatedAt: null,
        hasPendingSync: false,
      }
    }
  }

  // Decrypt the vault
  const decrypted = await decryptVault(encryptedData, masterPassword)

  // Ensure folders array exists
  if (!decrypted.folders) {
    decrypted.folders = []
  }

  return {
    vault: decrypted,
    updatedAt,
    hasPendingSync: pendingSync,
  }
}

/**
 * Encrypt and save vault
 * - Always saves encrypted data to local cache (IndexedDB)
 * - Tries to sync to server if online
 * - Marks pending sync if offline
 */
export async function persistVault(
  vault: VaultData,
  masterPassword: string
): Promise<{ synced: boolean }> {
  const encrypted = await encryptVault(vault, masterPassword)

  // Always save to local encrypted cache first
  await saveEncryptedVaultToCache(encrypted)

  // Try to sync to server if online
  if (navigator.onLine) {
    try {
      await saveVaultApi(encrypted)
      await markSyncComplete()
      return { synced: true }
    } catch (err) {
      console.warn('Failed to sync to server, data saved locally:', err)
      await markPendingSync()
      return { synced: false }
    }
  } else {
    // Offline - mark as pending sync
    await markPendingSync()
    return { synced: false }
  }
}

/**
 * Push local vault to server
 * Call this when coming back online with pending changes
 */
export async function syncVault(masterPassword: string): Promise<VaultApiResult> {
  if (!navigator.onLine) {
    throw new Error('Cannot sync while offline')
  }

  // Load local vault
  const localCached = await loadEncryptedVaultFromCache()
  if (!localCached) {
    // No local data, just fetch from server
    return fetchVault(masterPassword)
  }

  // Push local to server
  try {
    await saveVaultApi(localCached.data)
    await markSyncComplete()
  } catch (err) {
    console.warn('Failed to push to server:', err)
    throw err
  }

  // Return local data
  const decrypted = await decryptVault(localCached.data, masterPassword)
  if (!decrypted.folders) {
    decrypted.folders = []
  }

  return {
    vault: decrypted,
    updatedAt: new Date().toISOString(),
    hasPendingSync: false,
  }
}
