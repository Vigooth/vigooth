import { useState } from 'react';
import { CpcButton } from '@vigooth/ui';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyMovies } from '@/hooks/useNearbyMovies';
import { SearchResultCard } from '@/components/search/SearchResultCard';

type ViewMode = 'grid' | 'list' | 'compact';

const PREVIEW_COUNT = 12;

interface NearbyMoviesSectionProps {
  viewMode: ViewMode;
  gridClassName: string;
  collectionKeys: Set<string>;
}

/** Films showing today in the cinemas around the user, located on demand. */
export function NearbyMoviesSection({
  viewMode,
  gridClassName,
  collectionKeys,
}: NearbyMoviesSectionProps) {
  const { position, status, locate } = useGeolocation();
  const { data, isLoading, isError } = useNearbyMovies(position);
  const [expanded, setExpanded] = useState(false);

  const movies = data?.movies ?? [];
  const visibleMovies = expanded ? movies : movies.slice(0, PREVIEW_COUNT);

  function handleToggleExpanded() {
    setExpanded(!expanded);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-cpc-cyan-500 text-xs font-bold tracking-wider">
        FILMS À PROXIMITÉ{data?.city ? ` — ${data.city.toUpperCase()}` : ''}
      </div>

      {status === 'idle' && (
        <div>
          <CpcButton variant="outlined" color="cyan" onClick={locate}>
            Trouver les séances près de moi
          </CpcButton>
        </div>
      )}
      {(status === 'locating' || isLoading) && (
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
        <div className={gridClassName}>
          {visibleMovies.map(({ result, theaters }) => (
            <div key={`nearby-${result.id}`} className="flex flex-col gap-1 min-w-0">
              <SearchResultCard
                result={result}
                viewMode={viewMode}
                inCollection={collectionKeys.has(`movie:${result.id}`)}
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
