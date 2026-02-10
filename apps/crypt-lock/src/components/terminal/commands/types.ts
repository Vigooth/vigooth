import { TFunction } from 'i18next'
import { Folder, PasswordEntry, VaultData } from '../../../lib/crypto/vault'

export interface CommandContext {
  vault: VaultData | null
  currentFolder: { id: string; name: string } | null
  setCurrentFolder: (folder: { id: string; name: string } | null) => void
  addEntry: (folderId: string | null, data: { name: string; username: string; password: string; url: string }) => Promise<PasswordEntry | undefined>
  addFolder: (folder: Folder) => Promise<void>
  removeFolder: (folderId: string) => Promise<void>
  generatePassword: (length: number) => string
  generateId: () => string
}

export interface CommandResult {
  output: string
}

export type CommandFn = (args: string[], ctx: CommandContext, t: TFunction) => Promise<CommandResult> | CommandResult
