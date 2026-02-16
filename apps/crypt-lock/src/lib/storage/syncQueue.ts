import { get, set } from 'idb-keyval'

const SYNC_STATUS_KEY = 'crypt-lock-sync-status'

export interface SyncStatus {
  pendingSync: boolean
  lastSyncAt: string | null
  lastLocalChangeAt: string | null
}

/**
 * Get current sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const status = await get<SyncStatus>(SYNC_STATUS_KEY)
  return status || {
    pendingSync: false,
    lastSyncAt: null,
    lastLocalChangeAt: null,
  }
}

/**
 * Mark that we have local changes pending sync
 */
export async function markPendingSync(): Promise<void> {
  const status = await getSyncStatus()
  await set(SYNC_STATUS_KEY, {
    ...status,
    pendingSync: true,
    lastLocalChangeAt: new Date().toISOString(),
  })
}

/**
 * Mark sync as complete
 */
export async function markSyncComplete(): Promise<void> {
  const status = await getSyncStatus()
  await set(SYNC_STATUS_KEY, {
    ...status,
    pendingSync: false,
    lastSyncAt: new Date().toISOString(),
  })
}

/**
 * Check if we have pending changes to sync
 */
export async function hasPendingSync(): Promise<boolean> {
  const status = await getSyncStatus()
  return status.pendingSync
}
