/** A Paris date ("YYYY-MM-DD") within the coming week, or "week" for all of it. */
export type NearbyDay = string;

export const WHOLE_WEEK = 'week';

export interface DayOption {
  /** Paris date, "YYYY-MM-DD", as the API expects it. */
  value: string;
  label: string;
  /** Short weekday, e.g. "SAM", to date a showtime within the week. */
  weekday: string;
}

// en-CA formats dates as YYYY-MM-DD.
const isoDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' });
const dayLabel = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  weekday: 'long',
  day: 'numeric',
});
const shortWeekday = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  weekday: 'short',
});

/** Today and the six days after it, for which Allociné has showtimes. */
export function showtimeDays(now = new Date()): DayOption[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getTime() + index * 24 * 60 * 60 * 1000);
    const label = index === 0 ? "Aujourd'hui" : index === 1 ? 'Demain' : dayLabel.format(date);
    return {
      value: isoDate.format(date),
      label: label.charAt(0).toUpperCase() + label.slice(1),
      weekday: shortWeekday.format(date).replace('.', '').toUpperCase(),
    };
  });
}
