export function getAllocineSearchUrl(title: string, year?: number): string {
  const query = year ? `${title} ${year}` : title
  return `https://www.allocine.fr/rechercher/?q=${encodeURIComponent(query)}`
}

export function getAllocineFilmUrl(allocineId: string): string {
  return `https://www.allocine.fr/film/fichefilm_gen_cfilm=${allocineId}.html`
}
