import 'twin.macro'
import { getAllocineSearchUrl, getAllocineFilmUrl } from '@/utils/allocine'

interface ExternalLinksProps {
  imdbId: string | null
  tmdbId: number
  title: string
  year: number
  allocineId?: string | null
}

export function ExternalLinks({ imdbId, tmdbId, title, year, allocineId }: ExternalLinksProps) {
  const allocineUrl = allocineId ? getAllocineFilmUrl(allocineId) : getAllocineSearchUrl(title, year)

  return (
    <div tw="flex flex-wrap gap-2">
      {imdbId && (
        <a
          href={`https://www.imdb.com/title/${imdbId}`}
          target="_blank"
          rel="noopener noreferrer"
          tw="border-2 border-cpc-yellow-500 text-cpc-yellow-500 px-3 py-1 text-xs hover:bg-cpc-yellow-500 hover:text-black transition-colors"
        >
          IMDb
        </a>
      )}
      <a
        href={`https://www.themoviedb.org/movie/${tmdbId}`}
        target="_blank"
        rel="noopener noreferrer"
        tw="border-2 border-cpc-cyan-500 text-cpc-cyan-500 px-3 py-1 text-xs hover:bg-cpc-cyan-500 hover:text-black transition-colors"
      >
        TMDB
      </a>
      <a
        href={allocineUrl}
        target="_blank"
        rel="noopener noreferrer"
        tw="border-2 border-cpc-green-500 text-cpc-green-500 px-3 py-1 text-xs hover:bg-cpc-green-500 hover:text-black transition-colors"
      >
        ALLOCINE
      </a>
    </div>
  )
}
