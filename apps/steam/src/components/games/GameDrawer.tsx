import { CpcDrawer } from '@vigooth/ui';
import { useGameDetails } from '@/hooks/useGameDetails';
import type { SteamGame } from '@/types/game';
import { getHeroImage } from '@/config';

interface GameDrawerProps {
  game: SteamGame | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function GameDrawer({ game, open, onOpenChange }: GameDrawerProps) {
  const { data: details, isLoading } = useGameDetails(game?.appid ?? null);

  return (
    <CpcDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={game?.name ?? ''}
      side="right"
      noPadding
    >
      {game && (
        <div className="flex flex-col gap-4 p-4">
          <img
            src={getHeroImage(game.appid)}
            alt={game.name}
            className="w-full rounded-sm"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />

          <div className="flex flex-wrap gap-3 text-xs">
            <div className="border border-cpc-magenta-500 text-cpc-magenta-500 px-2 py-1">
              {formatPlaytime(game.playtime_forever)} played
            </div>
            {game.playtime_2weeks && game.playtime_2weeks > 0 && (
              <div className="border border-cpc-cyan-500 text-cpc-cyan-500 px-2 py-1">
                {formatPlaytime(game.playtime_2weeks)} last 2 weeks
              </div>
            )}
            {game.rtime_last_played > 0 && (
              <div className="border border-cpc-green-500 text-cpc-green-500 px-2 py-1">
                Last played: {new Date(game.rtime_last_played * 1000).toLocaleDateString()}
              </div>
            )}
          </div>

          {isLoading && (
            <div className="text-cpc-green-500 text-sm animate-pulse">LOADING DETAILS...</div>
          )}

          {details && (
            <>
              {details.short_description && (
                <p className="text-cpc-green-500 text-sm leading-relaxed">
                  {details.short_description}
                </p>
              )}

              {details.genres && details.genres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {details.genres.map((g) => (
                    <span
                      key={g.id}
                      className="border border-cpc-yellow-500 text-cpc-yellow-500 text-xs px-1.5 py-0.5"
                    >
                      {g.description}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3 text-xs text-cpc-green-900">
                {details.developers && (
                  <span>
                    DEV: <span className="text-cpc-green-500">{details.developers.join(', ')}</span>
                  </span>
                )}
                {details.release_date && (
                  <span>
                    RELEASE: <span className="text-cpc-green-500">{details.release_date.date}</span>
                  </span>
                )}
              </div>

              {details.metacritic && (
                <div className="flex items-center gap-2">
                  <span className="text-cpc-green-900 text-xs">METACRITIC:</span>
                  <span
                    className={`text-sm font-bold ${
                      details.metacritic.score >= 75
                        ? 'text-cpc-green-500'
                        : details.metacritic.score >= 50
                          ? 'text-cpc-yellow-500'
                          : 'text-cpc-red-500'
                    }`}
                  >
                    {details.metacritic.score}
                  </span>
                </div>
              )}

              {details.platforms && (
                <div className="flex gap-2 text-xs text-cpc-green-900">
                  {details.platforms.windows && <span className="text-cpc-cyan-500">WIN</span>}
                  {details.platforms.mac && <span className="text-cpc-cyan-500">MAC</span>}
                  {details.platforms.linux && <span className="text-cpc-cyan-500">LINUX</span>}
                </div>
              )}

              {details.screenshots && details.screenshots.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-cpc-green-900 text-xs">SCREENSHOTS</span>
                  <div className="grid grid-cols-2 gap-1">
                    {details.screenshots.slice(0, 4).map((s) => (
                      <img
                        key={s.id}
                        src={s.path_thumbnail}
                        alt="screenshot"
                        className="w-full"
                        loading="lazy"
                      />
                    ))}
                  </div>
                </div>
              )}

              <a
                href={`https://store.steampowered.com/app/${game.appid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-cpc-magenta-500 text-cpc-magenta-500 text-center py-2 text-sm hover:bg-cpc-magenta-500 hover:text-cpc-grey-900 transition-colors"
              >
                VIEW ON STEAM
              </a>
            </>
          )}
        </div>
      )}
    </CpcDrawer>
  );
}
