import type { Movie } from '@/types/movie';
import { getPosterUrl } from '@/utils/tmdbImage';
import { RatingBadge } from './RatingBadge';

type ViewMode = 'grid' | 'list' | 'compact';

interface MovieCardProps {
  movie: Movie;
  viewMode?: ViewMode;
  onClick?: (movie: Movie) => void;
}

export function MovieCard({ movie, viewMode = 'grid', onClick }: MovieCardProps) {
  const posterUrl = getPosterUrl(movie.poster_path, viewMode === 'compact' ? 'w185' : 'w342');

  if (viewMode === 'list') {
    return (
      <div
        className="group border-2 border-cpc-green-900 flex hover:border-cpc-cyan-500 transition-colors cursor-pointer"
        onClick={() => onClick?.(movie)}
      >
        <div className="w-20 flex-shrink-0 bg-cpc-grey-900 transition-[width] duration-400 group-hover:w-32">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={movie.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-28 flex items-center justify-center text-cpc-green-900 text-xs">
              N/A
            </div>
          )}
        </div>
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            <div className="text-cpc-cyan-500 font-bold text-sm truncate">{movie.title}</div>
            {movie.original_title && movie.original_title !== movie.title && (
              <div className="text-cpc-green-900 text-xs truncate">{movie.original_title}</div>
            )}
            <div className="text-cpc-green-900 text-xs">
              {movie.year || '\u2014'}
              {movie.director ? ` - ${movie.director}` : ''}
            </div>
            {movie.overview && (
              <div className="text-cpc-green-500 text-xs mt-1 line-clamp-2">{movie.overview}</div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {movie.personal_rating && (
              <RatingBadge label="NOTE" value={movie.personal_rating} max={10} />
            )}
            <RatingBadge label="IMDb" value={movie.imdb_rating} max={10} />
            <RatingBadge label="MC" value={movie.metascore} max={100} />
            <RatingBadge label="RT" value={movie.rotten_tomatoes} max={100} suffix="%" />
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'compact') {
    return (
      <div
        className="group border border-cpc-green-900 cursor-pointer hover:border-cpc-cyan-500 transition-colors"
        onClick={() => onClick?.(movie)}
      >
        <div className="aspect-[2/3] bg-cpc-grey-900 overflow-hidden relative">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={movie.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.removeAttribute('hidden');
              }}
            />
          ) : null}
          <div
            hidden={!!posterUrl}
            className="w-full h-full flex items-center justify-center text-cpc-green-900 text-[10px]"
          >
            NO POSTER
          </div>
          {movie.personal_rating && (
            <div className="absolute top-1 right-1 bg-black/80 border border-cpc-cyan-500 text-cpc-cyan-500 font-bold px-1 py-0.5 text-[10px]">
              {movie.personal_rating}
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-1">
            <div className="text-cpc-cyan-500 text-[10px] font-bold truncate">{movie.title}</div>
            <div className="text-cpc-green-900 text-[9px] truncate">
              {movie.year}
              {movie.director ? ` - ${movie.director}` : ''}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group border-2 border-cpc-green-900 cursor-pointer hover:border-cpc-cyan-500 transition-colors"
      onClick={() => onClick?.(movie)}
    >
      {/* Poster */}
      <div className="aspect-[2/3] bg-cpc-grey-900 overflow-hidden relative">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={movie.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.removeAttribute('hidden');
            }}
          />
        ) : null}
        <div
          hidden={!!posterUrl}
          className="w-full h-full flex items-center justify-center text-cpc-green-900"
        >
          NO POSTER
        </div>
        {/* Personal rating overlay */}
        {movie.personal_rating && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-80 border-2 border-cpc-cyan-500 text-cpc-cyan-500 font-bold px-2 py-1 text-sm">
            {movie.personal_rating}/10
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <div className="text-cpc-cyan-500 text-sm font-bold truncate group-hover:text-cpc-yellow-500 transition-colors">
          {movie.title}
        </div>
        <div className="text-cpc-green-900 text-xs">
          {movie.year}
          {movie.director ? ` - ${movie.director}` : ''}
        </div>

        {/* Ratings row */}
        <div className="flex flex-wrap gap-2 mt-1">
          <RatingBadge label="IMDb" value={movie.imdb_rating} max={10} />
          <RatingBadge label="MC" value={movie.metascore} max={100} />
          <RatingBadge label="RT" value={movie.rotten_tomatoes} max={100} suffix="%" />
        </div>
      </div>
    </div>
  );
}
