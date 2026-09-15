import { request } from './client';
import type { SubtitlesResponse, SubtitleDownloadResponse } from '@/types/movie';

export async function getSubtitles(imdbId: string): Promise<SubtitlesResponse> {
  return request<SubtitlesResponse>(`/api/subtitles?imdb_id=${encodeURIComponent(imdbId)}`);
}

export async function getSubtitleDownloadLink(fileId: number): Promise<SubtitleDownloadResponse> {
  return request<SubtitleDownloadResponse>(
    `/api/subtitles/download?file_id=${encodeURIComponent(fileId)}`,
  );
}
