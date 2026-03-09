import 'twin.macro'
import { useTranslation } from 'react-i18next'
import { ColorType } from './types'

interface AddFolderFormProps {
  name: string
  color: ColorType
  onNameChange: (name: string) => void
  onColorChange: (color: ColorType) => void
  onSubmit: () => void
  onCancel: () => void
}

const colorOptions: ColorType[] = ['green', 'red', 'cyan', 'yellow', 'magenta']

export function AddFolderForm({
  name,
  color,
  onNameChange,
  onColorChange,
  onSubmit,
  onCancel,
}: AddFolderFormProps) {
  const { t } = useTranslation()

  return (
    <div tw="border-2 border-cpc-cyan-500 p-3 space-y-2">
      <div tw="text-cpc-cyan-500 text-sm font-bold mb-2">{t('folder.new')}</div>
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        tw="w-full bg-transparent border border-cpc-cyan-500 text-cpc-cyan-500 px-2 py-1 text-xs outline-none"
        placeholder={t('folder.name')}
        autoFocus
      />
      <select
        value={color}
        onChange={(e) => onColorChange(e.target.value as ColorType)}
        tw="w-full bg-cpc-grey-900 border border-cpc-green-500 text-cpc-green-500 px-2 py-1 text-xs outline-none"
      >
        {colorOptions.map(c => (
          <option key={c} value={c}>{t(`folder.colors.${c}`)}</option>
        ))}
      </select>
      <div tw="flex gap-1">
        <button
          onClick={onSubmit}
          tw="flex-1 border border-cpc-cyan-500 text-cpc-cyan-500 py-1 text-xs hover:bg-cpc-cyan-500 hover:text-cpc-grey-900"
        >
          {t('folder.create')}
        </button>
        <button
          onClick={onCancel}
          tw="flex-1 border border-cpc-green-900 text-cpc-green-900 py-1 text-xs hover:border-cpc-green-500"
        >
          {t('folder.cancel')}
        </button>
      </div>
    </div>
  )
}
