// Zero-knowledge encryption using Web Crypto API
// The master password never leaves the client

export interface Folder {
  id: string
  name: string
  icon?: string
  color?: 'green' | 'red' | 'cyan' | 'yellow' | 'magenta'
  createdAt: string
}

export interface PasswordEntry {
  id: string
  folderId?: string  // null = racine (sans dossier)
  name: string
  username: string
  password: string
  url?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface VaultData {
  folders: Folder[]
  entries: PasswordEntry[]
  version: number
}

// Derive a key from master password using PBKDF2
async function deriveKey(masterPassword: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Encrypt vault data
export async function encryptVault(data: VaultData, masterPassword: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const key = await deriveKey(masterPassword, salt)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(data))
  )

  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)

  // Return as base64
  return btoa(String.fromCharCode(...combined))
}

// Decrypt vault data
export async function decryptVault(encryptedData: string, masterPassword: string): Promise<VaultData> {
  const decoder = new TextDecoder()

  // Decode from base64
  const combined = new Uint8Array(
    atob(encryptedData).split('').map(c => c.charCodeAt(0))
  )

  // Extract salt, iv, and encrypted data
  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 28)
  const encrypted = combined.slice(28)

  const key = await deriveKey(masterPassword, salt)

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    )

    return JSON.parse(decoder.decode(decrypted))
  } catch {
    throw new Error('Invalid master password')
  }
}

// Generate a random password
export function generatePassword(length = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  const array = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(array, byte => charset[byte % charset.length]).join('')
}

// Generate a unique ID
export function generateId(): string {
  return crypto.randomUUID()
}

// Create empty vault
export function createEmptyVault(): VaultData {
  return {
    folders: [],
    entries: [],
    version: 1,
  }
}
