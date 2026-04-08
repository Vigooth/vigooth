export interface Recommendation {
  title: string
  year: number
  tmdb_id?: number
  poster_path?: string
  reason: string
  allocine_url?: string
}

export interface RecommendationEvent {
  type: 'thinking' | 'tool_call' | 'recommendation' | 'done' | 'error'
  message: string
  data?: Recommendation | { recommendations: Recommendation[]; total: number }
}

import { request } from './client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8090'

export interface RecommendationHistoryEntry {
  id: string
  recommendations: Recommendation[]
  tokens_used: number
  created_at: string
}

interface HistoryResponse {
  history: RecommendationHistoryEntry[]
  total: number
}

export async function getRecommendationHistory(): Promise<HistoryResponse> {
  return request<HistoryResponse>('/api/recommendations/history')
}

export interface StreamOptions {
  movieIds?: string[]
  vibe?: number
  yearFrom?: number
  yearTo?: number
}

export function streamRecommendationsSimple(
  options: StreamOptions,
  onEvent: (event: RecommendationEvent) => void,
  signal?: AbortSignal
): void {
  streamFromEndpoint(`${API_URL}/api/recommendations/stream-simple`, options, onEvent, signal)
}

export function streamRecommendations(
  options: StreamOptions,
  onEvent: (event: RecommendationEvent) => void,
  signal?: AbortSignal
): void {
  streamFromEndpoint(`${API_URL}/api/recommendations/stream`, options, onEvent, signal)
}

function streamFromEndpoint(
  url: string,
  options: StreamOptions,
  onEvent: (event: RecommendationEvent) => void,
  signal?: AbortSignal
): void {
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      movie_ids: options.movieIds ?? [],
      vibe: options.vibe ?? 50,
      year_from: options.yearFrom || undefined,
      year_to: options.yearTo || undefined,
    }),
    signal,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No readable stream')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      function read(): Promise<void> {
        return reader!.read().then(({ done, value }) => {
          if (done) return

          buffer += decoder.decode(value, { stream: true })

          // Parse SSE events from buffer
          const lines = buffer.split('\n')
          buffer = ''

          let currentEvent = ''

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim()
            } else if (line.startsWith('data: ')) {
              const data = line.slice(6)
              try {
                const parsed = JSON.parse(data) as RecommendationEvent
                // Use the event type from SSE event field if available
                if (currentEvent) {
                  parsed.type = currentEvent as RecommendationEvent['type']
                }
                onEvent(parsed)
              } catch {
                // Skip malformed data
              }
              currentEvent = ''
            } else if (line.trim() === '') {
              // Empty line = end of event, reset
              currentEvent = ''
            } else {
              // Incomplete line, put back in buffer
              buffer += line + '\n'
            }
          }

          return read()
        })
      }

      return read()
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onEvent({
          type: 'error',
          message: err.message || 'Connection failed',
        })
      }
    })
}
