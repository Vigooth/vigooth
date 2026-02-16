import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { syncVault } from '@/lib/api/vault'
import { hasPendingSync } from '@/lib/storage'
import { useOnlineStatus } from './useOnlineStatus'
import { VAULT_QUERY_KEY } from './useVaultQuery'

interface UseSyncOptions {
  masterPassword: string | null
}

interface UseSyncReturn {
  isSyncing: boolean
  hasPending: boolean
  lastError: Error | null
  triggerSync: () => Promise<void>
}

/**
 * Hook to manage vault synchronization
 * - Tracks pending sync status
 * - Auto-syncs when coming back online
 * - Provides manual sync trigger
 */
export function useSync({ masterPassword }: UseSyncOptions): UseSyncReturn {
  const queryClient = useQueryClient()
  const isOnline = useOnlineStatus()
  const syncingRef = useRef(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [hasPending, setHasPending] = useState(false)
  const [lastError, setLastError] = useState<Error | null>(null)

  // Check pending status on mount and when online status changes
  useEffect(() => {
    const checkPending = async () => {
      const pending = await hasPendingSync()
      setHasPending(pending)
    }
    checkPending()
  }, [isOnline])

  // Reset lastError when connectivity changes — allows auto-retry
  useEffect(() => {
    setLastError(null)
  }, [isOnline])

  // Sync function
  const triggerSync = useCallback(async () => {
    if (!masterPassword || !isOnline || syncingRef.current) {
      return
    }

    syncingRef.current = true
    setIsSyncing(true)
    setLastError(null)

    try {
      const result = await syncVault(masterPassword)

      // Update React Query cache with synced data
      queryClient.setQueryData(VAULT_QUERY_KEY, {
        vault: result.vault,
        updatedAt: result.updatedAt,
      })

      setHasPending(false)
    } catch (err) {
      console.error('Sync failed:', err)
      setLastError(err instanceof Error ? err : new Error('Sync failed'))
    } finally {
      syncingRef.current = false
      setIsSyncing(false)
    }
  }, [masterPassword, isOnline, queryClient])

  // Auto-sync when coming back online with pending changes
  useEffect(() => {
    if (isOnline && hasPending && masterPassword && !lastError) {
      triggerSync()
    }
  }, [isOnline, hasPending, masterPassword, lastError, triggerSync])

  return {
    isSyncing,
    hasPending,
    lastError,
    triggerSync,
  }
}
