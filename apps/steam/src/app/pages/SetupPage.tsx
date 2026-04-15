import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CpcButton, CpcInput, CpcLayout } from '@vigooth/ui'
import { STEAM_API_KEY, STEAM_ID } from '@/config'

export function SetupPage() {
  const navigate = useNavigate()
  const [steamId, setSteamId] = useState('')

  const hasEnvConfig = !!STEAM_API_KEY && !!STEAM_ID

  const handleSubmit = () => {
    if (steamId.trim()) {
      navigate(`/library?steamId=${encodeURIComponent(steamId.trim())}`)
    }
  }

  if (hasEnvConfig) {
    navigate('/library', { replace: true })
    return null
  }

  return (
    <CpcLayout>
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="border-2 border-cpc-magenta-500 p-6 max-w-md w-full">
          <h1 className="text-cpc-magenta-500 text-xl font-bold mb-4">STEAM LIBRARY</h1>
          <p className="text-cpc-green-500 text-sm mb-6">
            Enter your Steam ID to view your game library. Your Steam profile must be set to public.
          </p>

          {!STEAM_API_KEY && (
            <div className="border border-cpc-red-500 text-cpc-red-500 text-xs p-3 mb-4">
              MISSING: Set VITE_STEAM_API_KEY in your .env file
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-cpc-green-900 text-xs mb-1 block">STEAM ID (64-bit) OR VANITY URL</label>
              <CpcInput
                value={steamId}
                onChange={setSteamId}
                onEnter={handleSubmit}
                placeholder="76561198012345678"
              />
            </div>
            <CpcButton variant="outlined" color="magenta" onClick={handleSubmit}>
              LOAD LIBRARY
            </CpcButton>
          </div>
        </div>
      </div>
    </CpcLayout>
  )
}
