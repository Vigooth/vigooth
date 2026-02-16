import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchVault, persistVault } from '@/lib/api/vault'
import {
  VaultData,
  Folder,
  PasswordEntry,
  generateId,
} from '@/lib/crypto/vault'
import { ColorType } from '@/types/colors'

export const VAULT_QUERY_KEY = ['vault'] as const

interface UseVaultQueryOptions {
  masterPassword: string | null
  onAuthError?: () => void
}

/**
 * Hook to fetch vault data
 */
export function useVaultQuery({ masterPassword, onAuthError }: UseVaultQueryOptions) {
  return useQuery({
    queryKey: VAULT_QUERY_KEY,
    queryFn: async () => {
      if (!masterPassword) {
        throw new Error('No master password')
      }
      return fetchVault(masterPassword)
    },
    enabled: !!masterPassword,
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof Error && error.message.includes('401')) {
        onAuthError?.()
        return false
      }
      return failureCount < 2
    },
  })
}

/**
 * Hook to save vault (generic mutation)
 */
export function useVaultMutation({ masterPassword }: { masterPassword: string | null }) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (vault: VaultData) => {
      if (!masterPassword) {
        throw new Error('No master password')
      }
      await persistVault(vault, masterPassword)
      return vault
    },
    onSuccess: (vault) => {
      queryClient.setQueryData(VAULT_QUERY_KEY, {
        vault,
        updatedAt: new Date().toISOString(),
      })
    },
  })
}

/**
 * Hook to add a folder
 */
export function useAddFolder({ masterPassword }: { masterPassword: string | null }) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: ColorType }) => {
      if (!masterPassword) {
        throw new Error('No master password')
      }

      const currentData = queryClient.getQueryData<{ vault: VaultData }>(VAULT_QUERY_KEY)
      if (!currentData) {
        throw new Error('No vault data')
      }

      const folder: Folder = {
        id: generateId(),
        name: name.toUpperCase(),
        color,
        createdAt: new Date().toISOString(),
      }

      const updatedVault: VaultData = {
        ...currentData.vault,
        folders: [...currentData.vault.folders, folder],
      }

      await persistVault(updatedVault, masterPassword)
      return { vault: updatedVault, folder }
    },
    onSuccess: ({ vault }) => {
      queryClient.setQueryData(VAULT_QUERY_KEY, {
        vault,
        updatedAt: new Date().toISOString(),
      })
    },
  })
}

/**
 * Hook to delete a folder
 */
export function useDeleteFolder({ masterPassword }: { masterPassword: string | null }) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (folderId: string) => {
      if (!masterPassword) {
        throw new Error('No master password')
      }

      const currentData = queryClient.getQueryData<{ vault: VaultData }>(VAULT_QUERY_KEY)
      if (!currentData) {
        throw new Error('No vault data')
      }

      // Move entries from deleted folder to root
      const updatedEntries = currentData.vault.entries.map(e =>
        e.folderId === folderId ? { ...e, folderId: undefined } : e
      )

      const updatedVault: VaultData = {
        ...currentData.vault,
        folders: currentData.vault.folders.filter(f => f.id !== folderId),
        entries: updatedEntries,
      }

      await persistVault(updatedVault, masterPassword)
      return updatedVault
    },
    onSuccess: (vault) => {
      queryClient.setQueryData(VAULT_QUERY_KEY, {
        vault,
        updatedAt: new Date().toISOString(),
      })
    },
  })
}

export interface AddEntryData {
  name: string
  username?: string
  password?: string
  url?: string
}

/**
 * Hook to add an entry
 */
export function useAddEntry({ masterPassword }: { masterPassword: string | null }) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      folderId,
      data,
    }: {
      folderId: string | null
      data: AddEntryData
    }) => {
      if (!masterPassword) {
        throw new Error('No master password')
      }

      const currentData = queryClient.getQueryData<{ vault: VaultData }>(VAULT_QUERY_KEY)
      if (!currentData) {
        throw new Error('No vault data')
      }

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

      const updatedVault: VaultData = {
        ...currentData.vault,
        entries: [...currentData.vault.entries, entry],
      }

      await persistVault(updatedVault, masterPassword)
      return { vault: updatedVault, entry }
    },
    onSuccess: ({ vault }) => {
      queryClient.setQueryData(VAULT_QUERY_KEY, {
        vault,
        updatedAt: new Date().toISOString(),
      })
    },
  })
}

/**
 * Hook to delete an entry
 */
export function useDeleteEntry({ masterPassword }: { masterPassword: string | null }) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!masterPassword) {
        throw new Error('No master password')
      }

      const currentData = queryClient.getQueryData<{ vault: VaultData }>(VAULT_QUERY_KEY)
      if (!currentData) {
        throw new Error('No vault data')
      }

      const updatedVault: VaultData = {
        ...currentData.vault,
        entries: currentData.vault.entries.filter(e => e.id !== entryId),
      }

      await persistVault(updatedVault, masterPassword)
      return updatedVault
    },
    onSuccess: (vault) => {
      queryClient.setQueryData(VAULT_QUERY_KEY, {
        vault,
        updatedAt: new Date().toISOString(),
      })
    },
  })
}

/**
 * Hook to move entries (batch)
 */
export function useMoveEntries({ masterPassword }: { masterPassword: string | null }) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      entryIds,
      targetFolderId,
    }: {
      entryIds: string[]
      targetFolderId: string | null
    }) => {
      if (!masterPassword) {
        throw new Error('No master password')
      }

      const currentData = queryClient.getQueryData<{ vault: VaultData }>(VAULT_QUERY_KEY)
      if (!currentData) {
        throw new Error('No vault data')
      }

      const idsSet = new Set(entryIds)
      const updatedVault: VaultData = {
        ...currentData.vault,
        entries: currentData.vault.entries.map(e =>
          idsSet.has(e.id) ? { ...e, folderId: targetFolderId || undefined } : e
        ),
      }

      await persistVault(updatedVault, masterPassword)
      return updatedVault
    },
    onSuccess: (vault) => {
      queryClient.setQueryData(VAULT_QUERY_KEY, {
        vault,
        updatedAt: new Date().toISOString(),
      })
    },
  })
}
