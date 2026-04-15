import { cn } from '@vigooth/ui'
import type { Movie } from '@/types/movie'
import { MovieCard } from './MovieCard'

type ViewMode = 'grid' | 'list' | 'compact'

interface MovieGridProps {
  movies: Movie[]
  viewMode?: ViewMode
  onMovieClick?: (movie: Movie) => void
  emptyMessage?: string
}

const gridClasses: Record<ViewMode, string> = {
  grid: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3',
  list: 'flex flex-col gap-2',
  compact: 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2',
}

export function MovieGrid({ movies, viewMode = 'grid', onMovieClick, emptyMessage }: MovieGridProps) {
  if (movies.length === 0) {
    return (
      <div className="text-center py-12 text-cpc-green-500">
        <div className="text-lg mb-2">{emptyMessage ?? 'NO MOVIES YET'}</div>
      </div>
    )
  }

  return (
    <div className={cn(gridClasses[viewMode])}>
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} viewMode={viewMode} onClick={onMovieClick} />
      ))}
    </div>
  )
}
