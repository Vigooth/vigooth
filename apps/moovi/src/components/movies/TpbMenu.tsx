import {
  CpcButton,
  CpcMenu,
  CpcMenuItem,
  CpcMenuSeparator,
  CpcSubmenu,
  ChevronDownIcon,
} from '@vigooth/ui';
import { useTpbSeason } from '@/hooks/useTpbSeason';
import type { TpbTorrent } from '@/types/movie';

interface TpbMenuProps {
  title: string;
  seasons: number;
}

/** Season packs from The Pirate Bay, one submenu per season. */
export function TpbMenu({ title, seasons }: TpbMenuProps) {
  const seasonNumbers = Array.from({ length: seasons }, (_, index) => index + 1);

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
      {seasonNumbers.map((season) => (
        <CpcSubmenu key={season} label={`Saison ${season}`}>
          <TpbSeasonItems title={title} season={season} />
        </CpcSubmenu>
      ))}
    </CpcMenu>
  );
}

interface TpbSeasonItemsProps {
  title: string;
  season: number;
}

/** Mounted when its submenu opens, so each season is only searched on demand. */
function TpbSeasonItems({ title, season }: TpbSeasonItemsProps) {
  const { data, isPending, isError } = useTpbSeason(title, season);

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
      <CpcMenuSeparator />
      <CpcMenuItem onClick={() => window.open(data.url, '_blank')}>Chercher sur TPB</CpcMenuItem>
    </>
  );
}

function openMagnet(torrent: TpbTorrent) {
  window.location.href = torrent.magnet;
}
