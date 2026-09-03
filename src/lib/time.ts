/**
 * Timezone helpers built on Intl only, so the library works in the browser,
 * in Node and on Cloudflare Workers without a date dependency.
 */

const NAIVE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

export interface NaiveParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  hasTime: boolean;
}

/** Parse a wall-clock string like `2026-09-10T14:00` without applying any timezone. */
export function parseNaive(input: string): NaiveParts {
  const m = NAIVE.exec(input.trim());
  if (!m) throw new Error(`Invalid date: "${input}". Use YYYY-MM-DD or YYYY-MM-DDTHH:mm.`);
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4] ?? 0),
    minute: Number(m[5] ?? 0),
    second: Number(m[6] ?? 0),
    hasTime: m[4] !== undefined,
  };
}

/** Offset in milliseconds of `timeZone` at the given instant. */
function offsetAt(instant: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(new Date(instant))) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return asUtc - instant;
}

/**
 * Convert a wall-clock time in `timeZone` to a UTC instant.
 * Two passes so DST transitions resolve correctly.
 */
export function wallToUtc(wall: string | NaiveParts, timeZone: string): Date {
  const p = typeof wall === 'string' ? parseNaive(wall) : wall;
  const naive = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  let guess = naive - offsetAt(naive, timeZone);
  guess = naive - offsetAt(guess, timeZone);
  return new Date(guess);
}

const pad = (n: number, len = 2) => String(n).padStart(len, '0');

/** `20260910T120000Z` */
export function toUtcCompact(date: Date): string {
  return (
    `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** `20260910T140000` — floating local time, no zone marker. */
export function toFloatingCompact(p: NaiveParts): string {
  return (
    `${pad(p.year, 4)}${pad(p.month)}${pad(p.day)}` +
    `T${pad(p.hour)}${pad(p.minute)}${pad(p.second)}`
  );
}

/** `20260910` */
export function toDateCompact(p: NaiveParts): string {
  return `${pad(p.year, 4)}${pad(p.month)}${pad(p.day)}`;
}

/** `2026-09-10` */
export function toDateIso(p: NaiveParts): string {
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

/** Add whole days to naive parts (used for exclusive all-day end dates). */
export function addDays(p: NaiveParts, days: number): NaiveParts {
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
  d.setUTCDate(d.getUTCDate() + days);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: p.hour,
    minute: p.minute,
    second: p.second,
    hasTime: p.hasTime,
  };
}

/** `+02:00` — the offset of `timeZone` at that wall time, formatted for ISO strings. */
export function isoOffset(wall: NaiveParts, timeZone: string): string {
  const utc = wallToUtc(wall, timeZone);
  const naive = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  const minutes = Math.round((naive - utc.getTime()) / 60000);
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** `2026-09-10T14:00:00+02:00` */
export function toIsoWithOffset(p: NaiveParts, timeZone: string): string {
  return (
    `${toDateIso(p)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}` +
    isoOffset(p, timeZone)
  );
}

/** The visitor's own IANA timezone, with a safe fallback. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Every IANA zone the runtime knows about, for the timezone picker. */
export function supportedTimeZones(): string[] {
  const anyIntl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
  if (typeof anyIntl.supportedValuesOf === 'function') {
    try {
      return anyIntl.supportedValuesOf('timeZone');
    } catch {
      /* fall through */
    }
  }
  return ['UTC', 'Europe/Brussels', 'Europe/London', 'America/New_York', 'America/Los_Angeles'];
}
