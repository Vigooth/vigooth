import { useParams, useNavigate } from 'react-router-dom'
import { CpcLayout } from '@vigooth/ui'
import 'twin.macro'
import { Header } from '@/components/layout/Header'
import { MovieDetails } from '@/components/movies/MovieDetails'

export function MoviePage() {
  const { tmdbId: tmdbIdParam } = useParams<{ tmdbId: string }>()
  const navigate = useNavigate()
  const tmdbIdNum = tmdbIdParam ? parseInt(tmdbIdParam, 10) : null

  if (!tmdbIdNum) {
    return (
      <CpcLayout>
        <div tw="h-full flex flex-col">
          <Header />
          <div tw="flex-1 flex items-center justify-center">
            <div tw="text-cpc-cyan-500">MOVIE NOT FOUND</div>
          </div>
        </div>
      </CpcLayout>
    )
  }

  return (
    <CpcLayout>
      <div tw="h-full flex flex-col">
        <Header />
        <div tw="flex-1 overflow-auto">
          <MovieDetails
            tmdbId={tmdbIdNum}
            onDeleted={() => navigate('/collection')}
          />
        </div>
      </div>
    </CpcLayout>
  )
}
