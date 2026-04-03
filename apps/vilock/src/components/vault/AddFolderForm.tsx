import tw from 'twin.macro'
import { useTranslation } from 'react-i18next'
import { ColorType, colorStyles } from './types'
import { VALID_COLORS } from '../../types/colors'

interface AddFolderFormProps {
  name: string
  color: ColorType
  onNameChange: (name: string) => void
  onColorChange: (color: ColorType) => void
  onSubmit: () => void
  onCancel: () => void
}

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
    <div tw="space-y-1">
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        tw="w-full bg-transparent border border-cpc-cyan-500 text-cpc-cyan-500 px-2 py-1 text-xs outline-none"
        placeholder={t('folder.name')}
        autoFocus
      />
      <div tw="flex gap-1">
        {VALID_COLORS.map(c => {
          const cs = colorStyles[c]
          return (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              css={[
                tw`w-5 h-5 transition-all`,
                cs.bg,
                color !== c && tw`opacity-50 hover:opacity-80`,
              ]}
            />
          )
        })}
      </div>
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
