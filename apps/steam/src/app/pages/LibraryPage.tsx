import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { CpcLayout, CpcButton, CpcInput } from '@vigooth/ui'
import { Header } from '@/components/layout/Header'
import { GameGrid } from '@/components/games/GameGrid'
import { GameDrawer } from '@/components/games/GameDrawer'
import { LibraryStats } from '@/components/games/LibraryStats'
import { FriendsSidebar } from '@/components/friends/FriendsSidebar'
import { useOwnedGames } from '@/hooks/useOwnedGames'
import { usePlayerSummary } from '@/hooks/usePlayerSummary'
import type { SteamGame, SortOption } from '@/types/game'

function sortGames(a: SteamGame, b: SteamGame, sort: SortOption): number {
  switch (sort) {
    case 'name':
      return a.name.localeCompare(b.name)
    case 'playtime':
      return b.playtime_forever - a.playtime_forever
    case 'recent':
      return b.rtime_last_played - a.rtime_last_played
  }
}

export function LibraryPage() {
  const { steamId } = useParams<{ steamId?: string }>()
  const { data, isLoading, error } = useOwnedGames(steamId)
  const { data: player } = usePlayerSummary(steamId)
  const [selectedGame, setSelectedGame] = useState<SteamGame | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('recent')

  const handleGameClick = (game: SteamGame) => {
    setSelectedGame(game)
    setDrawerOpen(true)
  }

  const games = data?.games
  const filteredGames = useMemo(() => {
    if (!games) return []

    const result = [...games]

    if (search) {
      const q = search.toLowerCase()
      return result
        .filter((g) => g.name.toLowerCase().includes(q))
        .sort((a, b) => sortGames(a, b, sort))
    }

    result.sort((a, b) => sortGames(a, b, sort))
    return result
  }, [games, search, sort])

  return (
    <CpcLayout>
      <div className="h-full flex flex-col overflow-hidden">
        <Header />

        {player && steamId && (
          <div className="flex items-center gap-3 p-3 border-b border-cpc-magenta-500">
            <img
              src={player.avatarfull}
              alt={player.personaname}
              className="w-8 h-8 border border-cpc-magenta-500"
            />
            <span className="text-cpc-magenta-500 font-bold text-sm">{player.personaname}</span>
            <a
              href={player.profileurl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cpc-cyan-500 text-xs hover:underline"
            >
              STEAM PROFILE
            </a>
          </div>
        )}

        {games && games.length > 0 && <LibraryStats games={games} />}

        <div className="flex items-center gap-3 p-3 border-b border-cpc-green-900 flex-wrap">
          <CpcInput
            value={search}
            onChange={setSearch}
            placeholder="Search games..."
          />
          <div className="flex gap-1">
            <CpcButton
              variant={sort === 'recent' ? 'filled' : 'outlined'}
              color="magenta"
              onClick={() => setSort('recent')}
            >
              RECENT
            </CpcButton>
            <CpcButton
              variant={sort === 'playtime' ? 'filled' : 'outlined'}
              color="magenta"
              onClick={() => setSort('playtime')}
            >
              PLAYTIME
            </CpcButton>
            <CpcButton
              variant={sort === 'name' ? 'filled' : 'outlined'}
              color="magenta"
              onClick={() => setSort('name')}
            >
              A-Z
            </CpcButton>
          </div>
          {data && (
            <span className="text-cpc-green-900 text-xs ml-auto">
              {filteredGames.length}/{data.game_count} GAMES
            </span>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3">
            {isLoading && (
              <div className="text-cpc-green-500 text-center py-12 animate-pulse">
                LOADING STEAM LIBRARY...
              </div>
            )}

            {error && (
              <div className="text-cpc-red-500 text-center py-12">
                <div className="text-lg mb-2">ERROR LOADING LIBRARY</div>
                <div className="text-sm">{error.message}</div>
                <div className="text-xs text-cpc-green-900 mt-2">
                  Make sure the Steam profile is public.
                </div>
              </div>
            )}

            {!isLoading && !error && (
              <GameGrid games={filteredGames} onGameClick={handleGameClick} />
            )}
          </div>
          <FriendsSidebar />
        </div>

        <GameDrawer
          game={selectedGame}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      </div>
    </CpcLayout>
  )
}
