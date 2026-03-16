import 'twin.macro'
import type { Movie } from '@/types/movie'
import { MovieCard } from './MovieCard'

interface MovieGridProps {
  movies: Movie[]
  onMovieClick?: (movie: Movie) => void
}

export function MovieGrid({ movies, onMovieClick }: MovieGridProps) {
  if (movies.length === 0) {
    return (
      <div tw="text-center py-12 text-cpc-green-900">
        <div tw="text-lg mb-2">NO MOVIES YET</div>
        <div tw="text-sm">Search and add movies to your collection</div>
      </div>
    )
  }

  return (
    <div tw="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} onClick={onMovieClick} />
      ))}
    </div>
  )
}
