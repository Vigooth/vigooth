export function getRatingColor(value: number, max: number): string {
  const ratio = value / max;
  if (ratio >= 0.7) return '#00ff00'; // green
  if (ratio >= 0.5) return '#ffff00'; // yellow
  return '#ff4444'; // red
}

export function formatRuntime(minutes: number): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export function parseGenres(genresJson: string): string[] {
  if (!genresJson) return [];
  try {
    return JSON.parse(genresJson);
  } catch {
    return [];
  }
}
