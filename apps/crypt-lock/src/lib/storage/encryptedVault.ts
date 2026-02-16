import { get, set, del } from 'idb-keyval'

const ENCRYPTED_VAULT_KEY = 'crypt-lock-encrypted-vault'

export interface EncryptedVaultCache {
  data: string // Encrypted vault data
  updatedAt: string
}

/**
 * Save encrypted vault to IndexedDB
 * Only stores encrypted data - passwords never stored in clear
 */
export async function saveEncryptedVaultToCache(
  encryptedData: string
): Promise<void> {
  const cache: EncryptedVaultCache = {
    data: encryptedData,
    updatedAt: new Date().toISOString(),
  }
  await set(ENCRYPTED_VAULT_KEY, cache)
}

/**
 * Load encrypted vault from IndexedDB
 * Returns null if no cache exists
 */
export async function loadEncryptedVaultFromCache(): Promise<EncryptedVaultCache | null> {
  const cache = await get<EncryptedVaultCache>(ENCRYPTED_VAULT_KEY)
  return cache || null
}

/**
 * Clear encrypted vault cache
 * Call this on logout
 */
export async function clearEncryptedVaultCache(): Promise<void> {
  await del(ENCRYPTED_VAULT_KEY)
}
