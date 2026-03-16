import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CpcLayout } from '@vigooth/ui'
import 'twin.macro'
import { useAuth } from '@/stores/auth'
import { useMoviesQuery } from '@/hooks/useMoviesQuery'
import { Header } from '@/components/layout/Header'
import { MovieGrid } from '@/components/movies/MovieGrid'
import { MovieDrawer } from '@/components/movies/MovieDrawer'
import type { Movie } from '@/types/movie'

export function CollectionPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [drawerMovie, setDrawerMovie] = useState<Movie | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const openDrawer = (movie: Movie) => {
    setDrawerMovie(movie)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    // drawerMovie stays set so the content remains visible during close animation
  }

  const {
    data,
    isLoading,
    isError,
  } = useMoviesQuery({
    onAuthError: () => {
      logout()
      navigate('/login')
    },
  })

  const movies = data?.movies ?? []

  return (
    <CpcLayout>
      <div tw="h-full flex flex-col">
        <Header />

        <div tw="flex-1 overflow-auto p-3">
          {isLoading ? (
            <div tw="flex items-center justify-center h-full">
              <div tw="text-cpc-cyan-500">LOADING COLLECTION...</div>
            </div>
          ) : isError ? (
            <div tw="flex items-center justify-center h-full">
              <div tw="text-cpc-red-500">ERROR LOADING COLLECTION</div>
            </div>
          ) : (
            <>
              <div tw="text-cpc-green-900 text-xs mb-3">
                {data?.total ?? 0} MOVIE{(data?.total ?? 0) !== 1 ? 'S' : ''} IN COLLECTION
              </div>
              <MovieGrid movies={movies} onMovieClick={openDrawer} />
            </>
          )}
        </div>
      </div>

      <MovieDrawer
        movie={drawerMovie}
        open={drawerOpen}
        onOpenChange={(open) => { if (!open) closeDrawer() }}
        onDeleted={closeDrawer}
      />
    </CpcLayout>
  )
}
