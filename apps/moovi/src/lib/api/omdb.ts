import { request } from './client'
import type { OmdbResponse, ParsedRatings } from '@/types/movie'

export async function getOmdbRatings(imdbId: string): Promise<OmdbResponse> {
  return request<OmdbResponse>(`/api/omdb?i=${encodeURIComponent(imdbId)}`)
}

export function parseOmdbRatings(data: OmdbResponse): ParsedRatings {
  const result: ParsedRatings = {
    metascore: null,
    imdbRating: null,
    rottenTomatoes: null,
  }

  if (data.Metascore && data.Metascore !== 'N/A') {
    result.metascore = parseInt(data.Metascore, 10)
  }

  if (data.imdbRating && data.imdbRating !== 'N/A') {
    result.imdbRating = parseFloat(data.imdbRating)
  }

  const rt = data.Ratings?.find((r) => r.Source === 'Rotten Tomatoes')
  if (rt) {
    const match = rt.Value.match(/(\d+)%/)
    if (match) {
      result.rottenTomatoes = parseInt(match[1], 10)
    }
  }

  return result
}
