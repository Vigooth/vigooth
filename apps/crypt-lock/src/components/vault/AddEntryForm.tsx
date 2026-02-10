import tw from 'twin.macro'
import { useTranslation } from 'react-i18next'
import { useVault } from './VaultContext'

interface AddEntryFormProps {
  folderId: string | null
}

export function AddEntryForm({ folderId }: AddEntryFormProps) {
  const { t } = useTranslation()
  const { entryFormData, setEntryFormData, submitEntry, cancelEntry, generatePassword } = useVault()

  return (
    <div tw="border-2 border-cpc-cyan-500 p-3 space-y-2">
      <input
        type="text"
        value={entryFormData.name}
        onChange={(e) => setEntryFormData({ ...entryFormData, name: e.target.value })}
        tw="w-full bg-transparent border border-cpc-cyan-500 text-cpc-cyan-500 px-2 py-1 text-xs outline-none focus:border-cpc-yellow-500"
        placeholder={t('entry.name')}
        autoFocus
      />
      <input
        type="text"
        value={entryFormData.username}
        onChange={(e) => setEntryFormData({ ...entryFormData, username: e.target.value })}
        tw="w-full bg-transparent border border-cpc-green-500 text-cpc-green-500 px-2 py-1 text-xs outline-none focus:border-cpc-yellow-500"
        placeholder={t('entry.username')}
      />
      <div tw="flex gap-1">
        <input
          type="text"
          value={entryFormData.password}
          onChange={(e) => setEntryFormData({ ...entryFormData, password: e.target.value })}
          tw="flex-1 bg-transparent border border-cpc-green-500 text-cpc-green-500 px-2 py-1 text-xs outline-none focus:border-cpc-yellow-500"
          placeholder={t('entry.password')}
        />
        <button
          onClick={generatePassword}
          tw="border border-cpc-magenta-500 text-cpc-magenta-500 px-2 text-xs hover:bg-cpc-magenta-500 hover:text-cpc-grey-900"
        >
          {t('entry.generate')}
        </button>
      </div>
      <input
        type="text"
        value={entryFormData.url}
        onChange={(e) => setEntryFormData({ ...entryFormData, url: e.target.value })}
        tw="w-full bg-transparent border border-cpc-green-500 text-cpc-green-500 px-2 py-1 text-xs outline-none focus:border-cpc-yellow-500"
        placeholder={t('entry.url')}
      />
      <div tw="flex gap-1">
        <button
          onClick={() => submitEntry(folderId)}
          disabled={!entryFormData.name}
          css={[
            tw`flex-1 border border-cpc-cyan-500 text-cpc-cyan-500 py-1 text-xs`,
            entryFormData.name ? tw`hover:bg-cpc-cyan-500 hover:text-cpc-grey-900` : tw`opacity-50 cursor-not-allowed`
          ]}
        >
          {t('entry.save')}
        </button>
        <button
          onClick={cancelEntry}
          tw="flex-1 border border-cpc-green-900 text-cpc-green-900 py-1 text-xs hover:border-cpc-green-500"
        >
          {t('entry.cancel')}
        </button>
      </div>
    </div>
  )
}
