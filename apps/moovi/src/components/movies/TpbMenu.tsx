import {
  CpcButton,
  CpcMenu,
  CpcMenuGroup,
  CpcMenuItem,
  CpcMenuSeparator,
  CpcSubmenu,
  ChevronDownIcon,
} from '@vigooth/ui';
import { useOpenWhenReady } from '@/hooks/useOpenWhenReady';
import { useTpbSearch } from '@/hooks/useTpbSearch';
import type { TmdbSeason, TpbResponse, TpbTorrent } from '@/types/movie';

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
          <TpbResultsSubmenu label="Toute la saison" title={title} season={season.season_number} />
          {season.episode_count > 0 && (
            <>
              <CpcMenuSeparator />
              <CpcMenuGroup label="Épisodes">
                {episodeNumbers(season.episode_count).map((episode) => (
                  <TpbResultsSubmenu
                    key={episode}
                    label={`Épisode ${episode}`}
                    title={title}
                    season={season.season_number}
                    episode={episode}
                  />
                ))}
              </CpcMenuGroup>
            </>
          )}
        </CpcSubmenu>
      ))}
    </CpcMenu>
  );
}

interface TpbResultsSubmenuProps {
  label: string;
  title: string;
  season: number;
  episode?: number;
}

/** Searches when hovered, spinning in place of the arrow until the results are in. */
function TpbResultsSubmenu({ label, title, season, episode }: TpbResultsSubmenuProps) {
  const { requested, stateFor } = useOpenWhenReady();
  const { data, isError } = useTpbSearch(title, season, episode, requested);

  return (
    <CpcSubmenu label={label} {...stateFor(data !== undefined || isError)}>
      {data ? (
        <TpbResults results={data} />
      ) : (
        <CpcMenuItem disabled>The Pirate Bay injoignable</CpcMenuItem>
      )}
    </CpcSubmenu>
  );
}

function TpbResults({ results }: { results: TpbResponse }) {
  return (
    <>
      {results.torrents?.map((torrent) => (
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
      {!results.found && <CpcMenuItem disabled>Aucun torrent</CpcMenuItem>}
      <CpcMenuItem onClick={() => window.open(results.url, '_blank')}>Chercher sur TPB</CpcMenuItem>
    </>
  );
}

function episodeNumbers(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1);
}

function openMagnet(torrent: TpbTorrent) {
  window.location.href = torrent.magnet;
}
