import { useState } from 'react';
import { CpcButton, CpcMenu, CpcMenuItem, CpcMenuSeparator, ChevronDownIcon } from '@vigooth/ui';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyMovies } from '@/hooks/useNearbyMovies';
import { SearchResultCard } from '@/components/search/SearchResultCard';
import { showtimeDays, WHOLE_WEEK } from '@/utils/showtimeDays';
import type { DayOption, NearbyDay } from '@/utils/showtimeDays';
import type { NextShowtime } from '@/types/movie';

type ViewMode = 'grid' | 'list' | 'compact';

const PREVIEW_COUNT = 12;

interface NearbyMoviesSectionProps {
  viewMode: ViewMode;
  gridClassName: string;
  collectionKeys: Set<string>;
}

/** Films showing in the cinemas around the user, located on demand, for a day or the week. */
export function NearbyMoviesSection({
  viewMode,
  gridClassName,
  collectionKeys,
}: NearbyMoviesSectionProps) {
  const { position, status, locate } = useGeolocation();
  const [days] = useState(() => showtimeDays());
  const [day, setDay] = useState<NearbyDay>(days[0].value);
  const { data, isLoading, isError, isPlaceholderData } = useNearbyMovies(position, day);
  const [expanded, setExpanded] = useState(false);

  const movies = data?.movies ?? [];
  const visibleMovies = expanded ? movies : movies.slice(0, PREVIEW_COUNT);

  function handleToggleExpanded() {
    setExpanded(!expanded);
  }

  function showtimeTag(showtime: NextShowtime): string {
    // Over the week, a showtime on another day than today says which one.
    const weekday =
      day === WHOLE_WEEK && showtime.date !== days[0].value
        ? `${days.find((option) => option.value === showtime.date)?.weekday ?? ''} `
        : '';
    return `${weekday}${showtime.time} ${showtime.version}`;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-cpc-cyan-500 text-xs font-bold tracking-wider">
          FILMS À PROXIMITÉ{data?.city ? ` — ${data.city.toUpperCase()}` : ''}
        </div>
        {status === 'located' && <DayMenu days={days} value={day} onChange={setDay} />}
      </div>

      {status === 'idle' && (
        <div>
          <CpcButton variant="outlined" color="cyan" onClick={locate}>
            Trouver les séances près de moi
          </CpcButton>
        </div>
      )}
      {(status === 'locating' || isLoading || isPlaceholderData) && (
        <div className="text-cpc-cyan-500 text-xs animate-pulse">RECHERCHE DES CINÉMAS...</div>
      )}
      {status === 'denied' && (
        <div className="text-cpc-green-900 text-xs">Localisation refusée par le navigateur.</div>
      )}
      {status === 'unavailable' && (
        <div className="text-cpc-green-900 text-xs">Position indisponible.</div>
      )}
      {isError && <div className="text-cpc-green-900 text-xs">Séances indisponibles.</div>}
      {data && movies.length === 0 && (
        <div className="text-cpc-green-900 text-xs">Aucune séance trouvée aujourd'hui.</div>
      )}

      {visibleMovies.length > 0 && (
        <div className={`${gridClassName} ${isPlaceholderData ? 'opacity-50' : ''}`}>
          {visibleMovies.map(({ result, theaters, next_showtimes }) => (
            <div key={`nearby-${result.id}`} className="flex flex-col gap-1 min-w-0">
              <SearchResultCard
                result={result}
                viewMode={viewMode}
                inCollection={collectionKeys.has(`movie:${result.id}`)}
                posterTags={next_showtimes.map(showtimeTag)}
              />
              <div className="text-cpc-green-900 text-[10px] truncate" title={theaters.join(', ')}>
                {theaters.length} cinéma{theaters.length > 1 ? 's' : ''} · {theaters.join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}
      {movies.length > PREVIEW_COUNT && (
        <div>
          <CpcButton size="xs" variant="text" color="cyan" onClick={handleToggleExpanded}>
            {expanded ? 'Voir moins' : `Voir les ${movies.length} films`}
          </CpcButton>
        </div>
      )}
    </div>
  );
}

interface DayMenuProps {
  days: DayOption[];
  value: NearbyDay;
  onChange: (day: NearbyDay) => void;
}

function DayMenu({ days, value, onChange }: DayMenuProps) {
  const label =
    value === WHOLE_WEEK
      ? 'Toute la semaine'
      : (days.find((option) => option.value === value)?.label ?? value);

  return (
    <CpcMenu
      color="cyan"
      trigger={
        <CpcButton size="xs" variant="outlined" color="cyan">
          {label}
          <ChevronDownIcon size="sm" className="cpc-chevron-flip" />
        </CpcButton>
      }
    >
      {days.map((option) => (
        <CpcMenuItem key={option.value} onClick={() => onChange(option.value)}>
          {option.label}
        </CpcMenuItem>
      ))}
      <CpcMenuSeparator />
      <CpcMenuItem onClick={() => onChange(WHOLE_WEEK)}>Toute la semaine</CpcMenuItem>
    </CpcMenu>
  );
}
