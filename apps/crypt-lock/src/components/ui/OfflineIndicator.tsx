import { useTranslation } from 'react-i18next'
import 'twin.macro'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineIndicator() {
  const { t } = useTranslation()
  const isOnline = useOnlineStatus()

  if (isOnline) {
    return null
  }

  return (
    <span tw="text-cpc-red-500 text-xs animate-pulse">
      {t('status.offline')}
    </span>
  )
}
