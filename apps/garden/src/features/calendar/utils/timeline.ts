import type { Occupation } from '@/types/garden';

const DAY_MS = 86_400_000;

export const MONTH_LABELS = [
  'JAN',
  'FEV',
  'MAR',
  'AVR',
  'MAI',
  'JUN',
  'JUL',
  'AOU',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

/**
 * Parse a wire date into local midnight.
 *
 * The `T00:00:00` suffix matters: `new Date('2026-03-01')` is parsed as UTC and
 * then rendered in local time, which lands on February 28th anywhere west of
 * Greenwich. Appending a time forces local interpretation.
 */
export function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export interface YearWindow {
  year: number;
  start: Date;
  end: Date;
  /** Inclusive day count — 366 in a leap year. */
  days: number;
}

export function yearWindow(year: number): YearWindow {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  return {
    year,
    start,
    end,
    days: Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1,
  };
}

export interface Band {
  /** Percentage offsets, ready for CSS `left` / `width`. */
  leftPct: number;
  widthPct: number;
  /** True when the record extends past the window on that side. */
  clippedStart: boolean;
  clippedEnd: boolean;
}

/**
 * Place a date range inside a year, as percentages.
 *
 * Ranges are inclusive on both ends, so a single-day record still gets one day
 * of width rather than collapsing to nothing. Anything reaching outside the year
 * is clipped and flagged, so the UI can show that it continues.
 */
export function bandFor(window: YearWindow, startsOn: string, endsOn: string): Band | null {
  const start = parseDate(startsOn);
  const end = parseDate(endsOn);
  if (!start || !end) return null;
  if (end < window.start || start > window.end) return null;

  const clippedStart = start < window.start;
  const clippedEnd = end > window.end;
  const from = clippedStart ? window.start : start;
  const to = clippedEnd ? window.end : end;

  const offsetDays = Math.round((from.getTime() - window.start.getTime()) / DAY_MS);
  const spanDays = Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1;

  return {
    leftPct: (offsetDays / window.days) * 100,
    widthPct: (spanDays / window.days) * 100,
    clippedStart,
    clippedEnd,
  };
}

export interface MonthTick {
  label: string;
  leftPct: number;
  widthPct: number;
}

/** Month columns for the header and the background gridlines. */
export function monthTicks(window: YearWindow): MonthTick[] {
  return MONTH_LABELS.map((label, month) => {
    const start = new Date(window.year, month, 1);
    const daysInMonth = new Date(window.year, month + 1, 0).getDate();
    const offsetDays = Math.round((start.getTime() - window.start.getTime()) / DAY_MS);
    return {
      label,
      leftPct: (offsetDays / window.days) * 100,
      widthPct: (daysInMonth / window.days) * 100,
    };
  });
}

/**
 * Stack overlapping occupations onto separate lanes.
 *
 * Without this, two occupations competing for the same bed would draw on top of
 * each other — which would hide exactly the conflict the view exists to reveal.
 * Greedy first-fit over occupations sorted by start date: each one takes the
 * lowest lane whose last occupant has already ended.
 */
export function assignLanes(occupations: Occupation[]): Map<string, number> {
  const dated = occupations
    .map((occupation) => ({
      occupation,
      start: parseDate(occupation.starts_on),
      end: parseDate(occupation.ends_on),
    }))
    .filter((entry): entry is { occupation: Occupation; start: Date; end: Date } =>
      entry.start !== null && entry.end !== null,
    )
    .toSorted((a, b) => a.start.getTime() - b.start.getTime());

  const laneEnds: Date[] = [];
  const lanes = new Map<string, number>();

  for (const entry of dated) {
    // Endpoints are inclusive, so a lane is only free once its occupant ends
    // strictly before this one starts — sharing a day is a conflict, not a fit.
    let lane = laneEnds.findIndex((end) => end < entry.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(entry.end);
    } else {
      laneEnds[lane] = entry.end;
    }
    lanes.set(entry.occupation.id, lane);
  }

  return lanes;
}

/** Highest lane index in use, so a row can size itself. */
export function laneCount(lanes: Map<string, number>): number {
  let max = 0;
  for (const lane of lanes.values()) max = Math.max(max, lane + 1);
  return Math.max(1, max);
}

/** Years that any occupation touches, so the year picker only offers real ones. */
export function occupiedYears(occupations: Occupation[]): number[] {
  const years = new Set<number>();
  for (const occupation of occupations) {
    const start = parseDate(occupation.starts_on);
    const end = parseDate(occupation.ends_on);
    if (!start || !end) continue;
    for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
      years.add(year);
    }
  }
  return [...years].toSorted((a, b) => a - b);
}
