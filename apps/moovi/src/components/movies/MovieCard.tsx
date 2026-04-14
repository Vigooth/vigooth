import type { Movie } from '@/types/movie'
import { getPosterUrl } from '@/utils/tmdbImage'
import { RatingBadge } from './RatingBadge'

interface MovieCardProps {
  movie: Movie
  onClick?: (movie: Movie) => void
}

export function MovieCard({ movie, onClick }: MovieCardProps) {
  const posterUrl = getPosterUrl(movie.poster_path, 'w342')

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
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextElementSibling?.removeAttribute('hidden')
            }}
          />
        ) : null}
        <div hidden={!!posterUrl} className="w-full h-full flex items-center justify-center text-cpc-green-900">
          NO POSTER
        </div>
        {/* Personal rating overlay */}
        {movie.personal_rating && (
          <div
            className="absolute top-2 right-2 bg-black bg-opacity-80 border-2 border-cpc-cyan-500 text-cpc-cyan-500 font-bold px-2 py-1 text-sm"
          >
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
          {movie.year}{movie.director ? ` - ${movie.director}` : ''}
        </div>

        {/* Ratings row */}
        <div className="flex flex-wrap gap-2 mt-1">
          <RatingBadge label="IMDb" value={movie.imdb_rating} max={10} />
          <RatingBadge label="MC" value={movie.metascore} max={100} />
          <RatingBadge label="RT" value={movie.rotten_tomatoes} max={100} suffix="%" />
        </div>
      </div>
    </div>
  )
}
