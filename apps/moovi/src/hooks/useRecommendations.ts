import { useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  streamRecommendations,
  getRecommendationHistory,
  type Recommendation,
  type RecommendationEvent,
  type RecommendationHistoryEntry,
} from '@/lib/api/recommendations'

export interface TokenUsage {
  input_tokens: number
  output_tokens: number
  total_tokens: number
}

export function useRecommendations() {
  const [, setSearchParams] = useSearchParams()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [events, setEvents] = useState<RecommendationEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tokens, setTokens] = useState<TokenUsage | null>(null)
  const [history, setHistory] = useState<RecommendationHistoryEntry[]>([])
  const [activeHistoryIndex, setActiveHistoryIndex] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const initialLoadDone = useRef(false)

  const setHistoryParam = useCallback((id: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (id) {
        next.set('history', id)
      } else {
        next.delete('history')
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  const refreshHistory = useCallback(() => {
    getRecommendationHistory()
      .then((res) => {
        setHistory(res.history)
        if (!initialLoadDone.current && res.history.length > 0) {
          initialLoadDone.current = true

          // Read URL param directly to avoid stale closure / dependency loop
          const historyId = new URLSearchParams(window.location.search).get('history')

          let targetIndex = res.history.length - 1
          if (historyId) {
            const urlIndex = res.history.findIndex((e) => e.id === historyId)
            if (urlIndex !== -1) targetIndex = urlIndex
          }

          const entry = res.history[targetIndex]
          setRecommendations(entry.recommendations)
          setActiveHistoryIndex(targetIndex)
          setHistoryParam(entry.id)
          if (entry.tokens_used) {
            setTokens({ input_tokens: 0, output_tokens: 0, total_tokens: entry.tokens_used })
          }
        } else if (initialLoadDone.current && res.history.length > 0) {
          const latest = res.history[res.history.length - 1]
          setActiveHistoryIndex(res.history.length - 1)
          setHistoryParam(latest.id)
        }
      })
      .catch(() => {})
  }, [setHistoryParam])

  useEffect(() => {
    refreshHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectHistoryEntry = useCallback((index: number) => {
    const entry = history[index]
    if (!entry) return
    setRecommendations(entry.recommendations)
    setActiveHistoryIndex(index)
    setHistoryParam(entry.id)
    setTokens(entry.tokens_used ? { input_tokens: 0, output_tokens: 0, total_tokens: entry.tokens_used } : null)
    setEvents([])
    setError(null)
  }, [history, setHistoryParam])

  const generate = useCallback((movieIds: string[] = [], vibe: number = 50) => {
    if (abortRef.current) {
      abortRef.current.abort()
    }

    setRecommendations([])
    setEvents([])
    setError(null)
    setTokens(null)
    setActiveHistoryIndex(null)
    setHistoryParam(null)
    setIsLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    streamRecommendations(
      { movieIds, vibe },
      (event) => {
        setEvents((prev) => [...prev, event])

        if (event.type === 'recommendation' && event.data && 'title' in event.data) {
          setRecommendations((prev) => [...prev, event.data as Recommendation])
        }

        if (event.type === 'done') {
          const data = event.data as { tokens?: TokenUsage } | undefined
          if (data?.tokens) {
            setTokens(data.tokens)
          }
          setIsLoading(false)
          refreshHistory()
        }

        if (event.type === 'error') {
          setError(event.message)
          setIsLoading(false)
        }
      },
      controller.signal
    )
  }, [refreshHistory, setHistoryParam])

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setIsLoading(false)
  }, [])

  return {
    recommendations,
    events,
    isLoading,
    error,
    tokens,
    history,
    activeHistoryIndex,
    selectHistoryEntry,
    generate,
    cancel,
  }
}
