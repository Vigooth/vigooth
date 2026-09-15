import { API_URL, request } from './client';
import type { SubtitlesResponse } from '@/types/movie';

export async function getSubtitles(imdbId: string): Promise<SubtitlesResponse> {
  return request<SubtitlesResponse>(`/api/subtitles?imdb_id=${encodeURIComponent(imdbId)}`);
}

/** Fetches the .srt through the API and saves it on the user's computer. */
export async function downloadSubtitle(fileId: number, fallbackName: string): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/subtitles/download?file_id=${encodeURIComponent(fileId)}`,
    { credentials: 'include' },
  );
  if (!response.ok) {
    const error: { error?: string } = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const fileName = parseFileName(response.headers.get('Content-Disposition')) ?? fallbackName;
  saveBlob(blob, fileName);
}

function parseFileName(contentDisposition: string | null): string | null {
  const match = contentDisposition?.match(/filename="?([^";]+)"?/);
  return match ? match[1] : null;
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
