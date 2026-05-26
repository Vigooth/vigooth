import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CpcButton } from '@vigooth/ui';
import type { TmdbSearchResult } from '@/types/movie';
import { getPosterUrl } from '@/utils/tmdbImage';
import { getMovieDetails, getMovieCredits, getTvDetails, getTvCredits } from '@/lib/api/tmdb';
import { getOmdbRatings, parseOmdbRatings } from '@/lib/api/omdb';
import { useAddMovie } from '@/hooks/useMoviesQuery';
import {
  useIsInWishlist,
  useAddToWishlist,
  useRemoveFromWishlist,
} from '@/hooks/useWishlist';
import type { AddMoviePayload } from '@/types/movie';

type ViewMode = 'grid' | 'list' | 'compact';

interface SearchResultCardProps {
  result: TmdbSearchResult;
  inCollection: boolean;
  viewMode?: ViewMode;
}

export function SearchResultCard({
  result,
  inCollection,
  viewMode = 'grid',
}: SearchResultCardProps) {
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(inCollection);
  const addMovie = useAddMovie();
  const isWishlisted = useIsInWishlist(result.id);
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  const wishlistPending = addToWishlist.isPending || removeFromWishlist.isPending;
  const posterSize = viewMode === 'compact' ? 'w185' : viewMode === 'list' ? 'w185' : 'w342';
  const posterUrl = getPosterUrl(result.poster_path, posterSize);
  const isTv = result.media_type === 'tv';
  const displayTitle = isTv ? result.name || '' : result.title || '';
  const displayOriginalTitle = isTv ? result.original_name || '' : result.original_title || '';
  const dateStr = isTv ? result.first_air_date : result.release_date;
  const year = dateStr ? parseInt(dateStr.substring(0, 4), 10) : 0;

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (wishlistPending) return;
    if (isWishlisted) {
      removeFromWishlist.mutate(result.id);
    } else {
      addToWishlist.mutate({
        tmdb_id: result.id,
        title: displayTitle,
        year,
        poster_path: result.poster_path || '',
      });
    }
  };

  const goToDetails = () => {
    if (window.getSelection()?.toString()) return;
    navigate(isTv ? `/tv/${result.id}` : `/movie/${result.id}`);
  };

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (added || adding) return;
    setAdding(true);

    try {
      let title: string, originalTitle: string, overview: string, genres: string;
      let posterPath: string, backdropPath: string, director: string;
      let runtime: number, imdbId: string, releaseYear: number;

      if (isTv) {
        const [details, credits] = await Promise.all([
          getTvDetails(result.id),
          getTvCredits(result.id),
        ]);
        title = details.name;
        originalTitle = details.original_name;
        overview = details.overview;
        genres = JSON.stringify(details.genres.map((g) => g.name));
        posterPath = details.poster_path || '';
        backdropPath = details.backdrop_path || '';
        director =
          details.created_by?.[0]?.name ||
          credits.crew.find((c) => c.job === 'Director')?.name ||
          '';
        runtime = details.episode_run_time?.[0] || 0;
        imdbId = details.external_ids?.imdb_id || '';
        releaseYear = details.first_air_date
          ? parseInt(details.first_air_date.substring(0, 4), 10)
          : 0;
      } else {
        const [details, credits] = await Promise.all([
          getMovieDetails(result.id),
          getMovieCredits(result.id),
        ]);
        title = details.title;
        originalTitle = details.original_title;
        overview = details.overview;
        genres = JSON.stringify(details.genres.map((g) => g.name));
        posterPath = details.poster_path || '';
        backdropPath = details.backdrop_path || '';
        director = credits.crew.find((c) => c.job === 'Director')?.name || '';
        runtime = details.runtime || 0;
        imdbId = details.imdb_id || '';
        releaseYear = details.release_date ? parseInt(details.release_date.substring(0, 4), 10) : 0;
      }

      let metascore: number | null = null;
      let imdbRating: number | null = null;
      let rottenTomatoes: number | null = null;

      if (imdbId) {
        try {
          const omdbData = await getOmdbRatings(imdbId);
          const parsed = parseOmdbRatings(omdbData);
          metascore = parsed.metascore;
          imdbRating = parsed.imdbRating;
          rottenTomatoes = parsed.rottenTomatoes;
        } catch {
          // OMDB is optional
        }
      }

      const payload: AddMoviePayload = {
        tmdb_id: result.id,
        imdb_id: imdbId,
        media_type: isTv ? 'tv' : 'movie',
        title,
        original_title: originalTitle,
        year: releaseYear,
        poster_path: posterPath,
        backdrop_path: backdropPath,
        overview,
        genres,
        director,
        runtime,
        metascore,
        imdb_rating: imdbRating,
        rotten_tomatoes: rottenTomatoes,
        personal_rating: null,
        notes: '',
      };

      await addMovie.mutateAsync(payload);
      setAdded(true);
    } catch (err) {
      console.error('Failed to add:', err);
    } finally {
      setAdding(false);
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        onClick={goToDetails}
        className="group border-2 border-cpc-green-900 flex hover:border-cpc-cyan-500 transition-colors cursor-pointer"
      >
        <div className="w-20 flex-shrink-0 bg-cpc-grey-900 transition-[width] duration-400 group-hover:w-32">
          {posterUrl ? (
            <img src={posterUrl} alt={displayTitle} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-28 flex items-center justify-center text-cpc-green-900 text-xs">
              N/A
            </div>
          )}
        </div>

        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            <div className="text-cpc-cyan-500 font-bold text-sm truncate">
              {displayTitle}
              {isTv && <span className="text-cpc-yellow-500 ml-1 text-xs font-normal">SERIE</span>}
            </div>
            {displayOriginalTitle !== displayTitle && (
              <div className="text-cpc-green-900 text-xs truncate">{displayOriginalTitle}</div>
            )}
            <div className="text-cpc-green-900 text-xs">{year || '—'}</div>
            <div className="text-cpc-green-500 text-xs mt-1 line-clamp-2">{result.overview}</div>
          </div>

          <div className="flex gap-2 mt-2">
            <CpcButton
              size="xs"
              color={added ? 'green' : adding ? 'yellow' : 'cyan'}
              onClick={handleAdd}
              disabled={added || adding}
            >
              {added ? 'IN COLLECTION' : adding ? 'ADDING...' : 'ADD'}
            </CpcButton>
            {!added && (
              <CpcButton
                size="xs"
                color="yellow"
                variant={isWishlisted ? 'filled' : 'outlined'}
                onClick={handleWishlist}
                disabled={wishlistPending}
              >
                {isWishlisted ? 'WISHLISTED' : 'WISHLIST'}
              </CpcButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'compact') {
    return (
      <div
        onClick={goToDetails}
        className="group border border-cpc-green-900 cursor-pointer hover:border-cpc-cyan-500 transition-colors"
      >
        <div className="aspect-[2/3] bg-cpc-grey-900 overflow-hidden relative">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={displayTitle}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-cpc-green-900 text-[10px]">
              NO POSTER
            </div>
          )}
          {added && (
            <div className="absolute top-1 right-1 bg-black/80 border border-cpc-green-500 text-cpc-green-500 font-bold px-1 py-0.5 text-[9px]">
              IN
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-1">
            <div className="text-cpc-cyan-500 text-[10px] font-bold truncate">
              {displayTitle}
              {isTv && <span className="text-cpc-yellow-500 ml-1">TV</span>}
            </div>
            <div className="text-cpc-green-900 text-[9px] truncate">{year || '—'}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={goToDetails}
      className="group border-2 border-cpc-green-900 cursor-pointer hover:border-cpc-cyan-500 transition-colors flex flex-col"
    >
      <div className="aspect-[2/3] bg-cpc-grey-900 overflow-hidden relative">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={displayTitle}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-cpc-green-900">
            NO POSTER
          </div>
        )}
        {isTv && (
          <div className="absolute top-2 left-2 bg-black/80 border border-cpc-yellow-500 text-cpc-yellow-500 font-bold px-1.5 py-0.5 text-[10px]">
            SERIE
          </div>
        )}
      </div>

      <div className="p-2 flex flex-col gap-1.5 flex-1">
        <div>
          <div className="text-cpc-cyan-500 text-sm font-bold truncate group-hover:text-cpc-yellow-500 transition-colors">
            {displayTitle}
          </div>
          <div className="text-cpc-green-900 text-xs">{year || '—'}</div>
        </div>

        <div className="flex flex-col gap-1.5 mt-auto">
          <CpcButton
            size="xs"
            fullWidth
            color={added ? 'green' : adding ? 'yellow' : 'cyan'}
            className="justify-center"
            onClick={handleAdd}
            disabled={added || adding}
          >
            {added ? 'IN COLLECTION' : adding ? 'ADDING...' : 'ADD'}
          </CpcButton>
          {!added && (
            <CpcButton
              size="xs"
              fullWidth
              color="yellow"
              variant={isWishlisted ? 'filled' : 'outlined'}
              className="justify-center"
              onClick={handleWishlist}
              disabled={wishlistPending}
            >
              {isWishlisted ? 'WISHLISTED' : 'WISHLIST'}
            </CpcButton>
          )}
        </div>
      </div>
    </div>
  );
}
