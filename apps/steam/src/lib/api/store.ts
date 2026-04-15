import type { AppDetailsResponse } from '@/types/game'

export async function fetchGameDetails(appid: number): Promise<AppDetailsResponse> {
  const res = await fetch(`/api/store/appdetails?appids=${appid}&l=english`)
  if (!res.ok) throw new Error(`Store API error: ${res.status}`)
  return res.json()
}
