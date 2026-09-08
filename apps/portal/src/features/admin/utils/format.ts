import type { IPLocation } from '../types/visit';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatVisitDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

/** "Lyon, Auvergne-Rhône-Alpes, FR", dropping whatever the provider left blank. */
export function formatLocation(location: IPLocation | undefined): string {
  if (!location) return '—';
  const parts = [location.city, location.region, location.country_code].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '—';
}

/** A country code as its flag emoji, or nothing when the code is missing. */
export function countryFlag(code: string): string {
  if (code.length !== 2) return '';
  const base = 0x1f1e6 - 'A'.charCodeAt(0);
  return String.fromCodePoint(base + code.charCodeAt(0), base + code.charCodeAt(1));
}

/** Referrers are shown by host only: the full URL is rarely useful and often huge. */
export function formatReferrer(referrer: string): string {
  if (!referrer) return '—';
  try {
    return new URL(referrer).host;
  } catch {
    return referrer;
  }
}
