import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useQueryParam(key: string, defaultValue = ''): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const value = searchParams.get(key) || defaultValue

  const setValue = useCallback(
    (next: string) => {
      setSearchParams((prev) => {
        if (next && next !== defaultValue) prev.set(key, next)
        else prev.delete(key)
        return prev
      }, { replace: true })
    },
    [key, defaultValue, setSearchParams],
  )

  return [value, setValue]
}

export function useQueryParamNumber(key: string, defaultValue = 0): [number, (value: number) => void] {
  const [raw, setRaw] = useQueryParam(key, String(defaultValue))
  const value = Number(raw) || defaultValue

  const setValue = useCallback(
    (next: number) => setRaw(next === defaultValue ? '' : String(next)),
    [defaultValue, setRaw],
  )

  return [value, setValue]
}
