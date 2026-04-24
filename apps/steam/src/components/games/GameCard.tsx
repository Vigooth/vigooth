import type { SteamGame } from '@/types/game';
import { getHeaderImage } from '@/config';

interface GameCardProps {
  game: SteamGame;
  onClick?: (game: SteamGame) => void;
}

function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function GameCard({ game, onClick }: GameCardProps) {
  const headerUrl = getHeaderImage(game.appid);

  return (
    <div
      className="group border-2 border-cpc-green-900 cursor-pointer hover:border-cpc-magenta-500 transition-colors"
      onClick={() => onClick?.(game)}
    >
      <div className="aspect-[460/215] bg-cpc-grey-900 overflow-hidden relative">
        <img
          src={headerUrl}
          alt={game.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        {game.playtime_forever > 0 && (
          <div className="absolute top-1.5 right-1.5 bg-black/80 border border-cpc-magenta-500 text-cpc-magenta-500 font-bold px-1.5 py-0.5 text-xs">
            {formatPlaytime(game.playtime_forever)}
          </div>
        )}
      </div>
      <div className="p-2">
        <div className="text-cpc-magenta-500 text-sm font-bold truncate group-hover:text-cpc-yellow-500 transition-colors">
          {game.name}
        </div>
        <div className="flex gap-3 text-cpc-green-900 text-xs mt-0.5">
          {game.playtime_2weeks && game.playtime_2weeks > 0 && (
            <span className="text-cpc-cyan-500">{formatPlaytime(game.playtime_2weeks)} recent</span>
          )}
          {game.rtime_last_played > 0 && (
            <span>{new Date(game.rtime_last_played * 1000).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}
