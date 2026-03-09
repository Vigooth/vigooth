import 'twin.macro'
import { useNavigate } from 'react-router-dom'
import type { Movie } from '@/types/movie'
import { getPosterUrl } from '@/utils/tmdbImage'
import { RatingBadge } from './RatingBadge'

interface MovieCardProps {
  movie: Movie
}

export function MovieCard({ movie }: MovieCardProps) {
  const navigate = useNavigate()
  const posterUrl = getPosterUrl(movie.poster_path, 'w342')

  return (
    <div
      className="group"
      onClick={() => navigate(`/movie/${movie.id}`)}
      tw="border-2 border-cpc-green-900 cursor-pointer hover:border-cpc-cyan-500 transition-colors"
    >
      {/* Poster */}
      <div tw="aspect-[2/3] bg-cpc-grey-900 overflow-hidden relative">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={movie.title}
            tw="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
          />
        ) : (
          <div tw="w-full h-full flex items-center justify-center text-cpc-green-900">
            NO POSTER
          </div>
        )}
        {/* Personal rating overlay */}
        {movie.personal_rating && (
          <div
            tw="absolute top-2 right-2 bg-black bg-opacity-80 border-2 border-cpc-cyan-500 text-cpc-cyan-500 font-bold px-2 py-1 text-sm"
          >
            {movie.personal_rating}/10
          </div>
        )}
      </div>

      {/* Info */}
      <div tw="p-2">
        <div tw="text-cpc-cyan-500 text-sm font-bold truncate group-hover:text-cpc-yellow-500 transition-colors">
          {movie.title}
        </div>
        <div tw="text-cpc-green-900 text-xs">
          {movie.year}{movie.director ? ` - ${movie.director}` : ''}
        </div>

        {/* Ratings row */}
        <div tw="flex flex-wrap gap-2 mt-1">
          <RatingBadge label="IMDb" value={movie.imdb_rating} max={10} />
          <RatingBadge label="MC" value={movie.metascore} max={100} />
          <RatingBadge label="RT" value={movie.rotten_tomatoes} max={100} suffix="%" />
        </div>
      </div>
    </div>
  )
}
