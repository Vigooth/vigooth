import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CpcInput, CpcButton } from '@vigooth/ui'
import { useFriendList } from '@/hooks/useFriendList'
import { usePlayerSearch } from '@/hooks/usePlayerSearch'
import type { FriendWithProfile } from '@/hooks/useFriendList'

function FriendRow({ friend, onClick }: { friend: FriendWithProfile; onClick: () => void }) {
  return (
    <div
      className="group flex items-center gap-2 px-2 py-1.5 hover:bg-cpc-magenta-500/10 cursor-pointer transition-colors"
      onClick={onClick}
    >
      {friend.avatarfull ? (
        <img
          src={friend.avatarfull}
          alt={friend.personaname}
          className="w-6 h-6 border border-cpc-green-900 group-hover:border-cpc-magenta-500 transition-colors shrink-0"
        />
      ) : (
        <div className="w-6 h-6 border border-cpc-green-900 flex items-center justify-center text-cpc-green-900 text-[8px] shrink-0">?</div>
      )}
      <span className="text-cpc-green-500 text-xs truncate group-hover:text-cpc-magenta-500 transition-colors">
        {friend.personaname}
      </span>
    </div>
  )
}

export function FriendsSidebar() {
  const navigate = useNavigate()
  const { data: friends, isLoading, error } = useFriendList()
  const { search: searchSteam, searching, error: searchError } = usePlayerSearch()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!friends) return []
    if (!search) return friends
    const q = search.toLowerCase()
    return friends.filter((f) => f.personaname.toLowerCase().includes(q))
  }, [friends, search])

  const handleFriendClick = (steamid: string) => {
    navigate(`/u/${steamid}`)
  }

  const handleSteamSearch = () => {
    if (search.trim()) {
      searchSteam(search)
    }
  }

  const showSteamSearch = search.trim().length > 0 && filtered.length === 0 && !isLoading

  return (
    <div className="hidden lg:flex flex-col w-56 border-l border-cpc-green-900 shrink-0 h-full overflow-hidden">
      <div className="p-2 border-b border-cpc-green-900">
        <div className="text-cpc-magenta-500 text-xs font-bold mb-1.5">
          FRIENDS {friends ? `(${friends.length})` : ''}
        </div>
        <CpcInput
          value={search}
          onChange={setSearch}
          onEnter={showSteamSearch ? handleSteamSearch : undefined}
          placeholder="Filter..."
          cursorBlink={false}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="text-cpc-green-500 text-xs text-center py-4 animate-pulse">LOADING...</div>
        )}
        {error && (
          <div className="text-cpc-red-500 text-xs text-center py-4">PRIVATE</div>
        )}
        {!isLoading && !error && filtered.map((friend) => (
          <FriendRow
            key={friend.steamid}
            friend={friend}
            onClick={() => handleFriendClick(friend.steamid)}
          />
        ))}
        {showSteamSearch && (
          <div className="p-3 flex flex-col items-center gap-2">
            <span className="text-cpc-green-900 text-xs text-center">No friends match</span>
            <CpcButton
              variant="outlined"
              color="cyan"
              onClick={handleSteamSearch}
            >
              {searching ? '...' : `SEARCH STEAM`}
            </CpcButton>
            {searchError && (
              <span className="text-cpc-red-500 text-[10px]">{searchError}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
