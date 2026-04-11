import type { Movie } from '@/types/movie'
import { MovieCard } from './MovieCard'

interface MovieGridProps {
  movies: Movie[]
  onMovieClick?: (movie: Movie) => void
  emptyMessage?: string
}

export function MovieGrid({ movies, onMovieClick, emptyMessage }: MovieGridProps) {
  if (movies.length === 0) {
    return (
      <div className="text-center py-12 text-cpc-green-500">
        <div className="text-lg mb-2">{emptyMessage ?? 'NO MOVIES YET'}</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} onClick={onMovieClick} />
      ))}
    </div>
  )
}
