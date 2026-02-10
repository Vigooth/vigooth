import tw from 'twin.macro'
import { useTranslation } from 'react-i18next'
import { PasswordEntry } from '../../lib/crypto/vault'
import { useVault } from './VaultContext'

interface EntryCardProps {
  entry: PasswordEntry
}

export function EntryCard({ entry }: EntryCardProps) {
  const { t } = useTranslation()
  const { expandedEntryId, toggleEntry, copiedField, copyField, deleteEntry } = useVault()
  const isExpanded = expandedEntryId === entry.id

  return (
    <div
      onClick={() => toggleEntry(entry.id)}
      css={[
        tw`p-2 cursor-pointer transition-colors`,
        isExpanded ? tw`bg-cpc-green-500 text-cpc-grey-900` : tw`hover:bg-cpc-green-500/10`
      ]}
    >
      <div tw="flex justify-between items-center text-sm">
        <span tw="font-bold truncate">{entry.name}</span>
      </div>
      <div tw="text-xs truncate opacity-80">{entry.username}</div>

      {isExpanded && (
        <div tw="mt-2 pt-2 border-t border-cpc-grey-900 space-y-2">
          {entry.url && <div tw="text-xs opacity-80 truncate">{entry.url}</div>}
          <div tw="flex flex-wrap gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); copyField(entry.username, `user-${entry.id}`) }}
              tw="border border-current px-2 py-0.5 text-xs hover:bg-cpc-grey-900 hover:text-cpc-green-500"
            >
              {copiedField === `user-${entry.id}` ? t('entry.copied') : t('entry.copyUser')}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); copyField(entry.password, `pass-${entry.id}`) }}
              tw="border border-current px-2 py-0.5 text-xs hover:bg-cpc-grey-900 hover:text-cpc-green-500"
            >
              {copiedField === `pass-${entry.id}` ? t('entry.copied') : t('entry.copyPass')}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id) }}
              tw="border border-cpc-red-500 text-cpc-red-500 px-2 py-0.5 text-xs hover:bg-cpc-red-500 hover:text-cpc-grey-900"
            >
              {t('entry.delete')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
