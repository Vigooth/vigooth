import type { SteamGame } from '@/types/game'
import { GameCard } from './GameCard'

interface GameGridProps {
  games: SteamGame[]
  onGameClick?: (game: SteamGame) => void
}

export function GameGrid({ games, onGameClick }: GameGridProps) {
  if (games.length === 0) {
    return (
      <div className="text-center py-12 text-cpc-green-500">
        <div className="text-lg mb-2">NO GAMES FOUND</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {games.map((game) => (
        <GameCard key={game.appid} game={game} onClick={onGameClick} />
      ))}
    </div>
  )
}
