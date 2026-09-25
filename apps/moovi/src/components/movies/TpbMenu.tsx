import {
  CpcButton,
  CpcMenu,
  CpcMenuGroup,
  CpcMenuItem,
  CpcMenuSeparator,
  CpcSubmenu,
  ChevronDownIcon,
} from '@vigooth/ui';
import { useTpbSearch } from '@/hooks/useTpbSearch';
import type { TmdbSeason, TpbTorrent } from '@/types/movie';

interface TpbMenuProps {
  title: string;
  seasons: TmdbSeason[];
}

/** Torrents from The Pirate Bay: one submenu per season, then per episode. */
export function TpbMenu({ title, seasons }: TpbMenuProps) {
  // Season 0 holds the specials, which releases don't number consistently.
  const numberedSeasons = seasons.filter((season) => season.season_number > 0);

  return (
    <CpcMenu
      color="orange"
      trigger={
        <CpcButton variant="outlined" color="orange">
          TPB
          <ChevronDownIcon size="sm" className="cpc-chevron-flip" />
        </CpcButton>
      }
    >
      {numberedSeasons.map((season) => (
        <CpcSubmenu key={season.season_number} label={`Saison ${season.season_number}`}>
          <TpbResults title={title} season={season.season_number} />
          {season.episode_count > 0 && (
            <>
              <CpcMenuSeparator />
              <CpcMenuGroup label="Épisodes">
                {episodeNumbers(season.episode_count).map((episode) => (
                  <CpcSubmenu key={episode} label={`Épisode ${episode}`}>
                    <TpbResults title={title} season={season.season_number} episode={episode} />
                  </CpcSubmenu>
                ))}
              </CpcMenuGroup>
            </>
          )}
        </CpcSubmenu>
      ))}
    </CpcMenu>
  );
}

interface TpbResultsProps {
  title: string;
  season: number;
  episode?: number;
}

/** Mounted when its submenu opens, so each search only runs on demand. */
function TpbResults({ title, season, episode }: TpbResultsProps) {
  const { data, isPending, isError } = useTpbSearch(title, season, episode);

  if (isPending) return <CpcMenuItem disabled>Recherche…</CpcMenuItem>;
  if (isError) return <CpcMenuItem disabled>The Pirate Bay injoignable</CpcMenuItem>;

  return (
    <>
      {data.torrents?.map((torrent) => (
        <CpcMenuItem key={torrent.id} onClick={() => openMagnet(torrent)}>
          <span className="flex flex-col gap-0.5 max-w-[min(28rem,calc(100vw-3rem))]">
            <span className="flex items-baseline gap-1">
              {torrent.quality && <span className="shrink-0">{torrent.quality}</span>}
              <span className="opacity-60">
                {torrent.size} — {torrent.seeders} seeders
              </span>
            </span>
            <span className="text-xs whitespace-normal break-all">{torrent.name}</span>
          </span>
        </CpcMenuItem>
      ))}
      {!data.found && <CpcMenuItem disabled>Aucun torrent</CpcMenuItem>}
      <CpcMenuItem onClick={() => window.open(data.url, '_blank')}>Chercher sur TPB</CpcMenuItem>
    </>
  );
}

function episodeNumbers(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1);
}

function openMagnet(torrent: TpbTorrent) {
  window.location.href = torrent.magnet;
}
