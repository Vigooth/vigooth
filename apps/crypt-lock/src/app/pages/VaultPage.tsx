import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CpcLayout } from '@vigooth/ui'
import tw from 'twin.macro'

interface PasswordEntry {
  id: string
  name: string
  username: string
  password: string
}

const mockEntries: PasswordEntry[] = [
  { id: '1', name: 'EMAIL', username: 'user@example.com', password: '********' },
  { id: '2', name: 'GITHUB', username: 'developer', password: '********' },
  { id: '3', name: 'SERVER SSH', username: 'root', password: '********' },
]

export function VaultPage() {
  const navigate = useNavigate()
  const [entries] = useState<PasswordEntry[]>(mockEntries)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleLock = () => {
    navigate('/')
  }

  return (
    <CpcLayout>
      <div tw="h-full flex flex-col">
        {/* Header */}
        <div tw="flex justify-between items-center p-4 border-b-2 border-cpc-green-500">
          <div>
            <span tw="text-cpc-red-500 font-bold">CRYPT-LOCK</span>
            <span tw="text-cpc-green-500 ml-2">VAULT</span>
          </div>
          <button
            onClick={handleLock}
            tw="border-2 border-cpc-red-500 text-cpc-red-500 px-4 py-1 hover:bg-cpc-red-500 hover:text-cpc-grey-900 transition-colors text-sm"
          >
            LOCK
          </button>
        </div>

        {/* Entries list */}
        <div tw="flex-1 overflow-auto p-4">
          <div tw="text-cpc-yellow-500 mb-4">
            STORED PASSWORDS: {entries.length}
          </div>

          <div tw="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => setSelectedId(selectedId === entry.id ? null : entry.id)}
                css={[
                  tw`border-2 border-cpc-green-500 p-3 cursor-pointer transition-colors`,
                  selectedId === entry.id
                    ? tw`bg-cpc-green-500 text-cpc-grey-900`
                    : tw`hover:border-cpc-yellow-500`
                ]}
              >
                <div tw="flex justify-between items-center">
                  <span tw="font-bold">{entry.name}</span>
                  <span tw="text-sm">{entry.username}</span>
                </div>
                {selectedId === entry.id && (
                  <div tw="mt-2 pt-2 border-t border-cpc-grey-900">
                    <div tw="flex gap-2 mt-2">
                      <button tw="border border-current px-2 py-1 text-xs hover:bg-cpc-grey-900 hover:text-cpc-green-500">
                        COPY USER
                      </button>
                      <button tw="border border-current px-2 py-1 text-xs hover:bg-cpc-grey-900 hover:text-cpc-green-500">
                        COPY PASS
                      </button>
                      <button tw="border border-current px-2 py-1 text-xs hover:bg-cpc-grey-900 hover:text-cpc-green-500">
                        EDIT
                      </button>
                      <button tw="border border-cpc-red-500 text-cpc-red-500 px-2 py-1 text-xs hover:bg-cpc-red-500 hover:text-cpc-grey-900">
                        DELETE
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div tw="p-4 border-t-2 border-cpc-green-500">
          <button tw="w-full border-2 border-cpc-cyan-500 text-cpc-cyan-500 py-2 hover:bg-cpc-cyan-500 hover:text-cpc-grey-900 transition-colors">
            + ADD NEW ENTRY
          </button>
        </div>
      </div>
    </CpcLayout>
  )
}
