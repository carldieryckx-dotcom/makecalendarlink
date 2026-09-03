import type { CalendarEvent, Provider } from './event';

/**
 * Click counting on Cloudflare D1.
 *
 * Two tables, no personal data: no IP address, no user agent, no cookie.
 * Country comes from Cloudflare's edge header and is stored at country level
 * only, which keeps the whole thing outside GDPR consent territory.
 */

export interface D1Like {
  prepare(query: string): {
    bind(...values: unknown[]): {
      run(): Promise<unknown>;
      all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
      first<T = Record<string, unknown>>(): Promise<T | null>;
    };
    all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  };
}

export interface ClickContext {
  db?: D1Like;
  /** `ctx.waitUntil`, so the redirect is never blocked by the write. */
  waitUntil?: (promise: Promise<unknown>) => void;
}

export interface RecordClickInput {
  key: string;
  provider: Provider;
  country?: string;
  referer?: string;
  event?: CalendarEvent;
}

const HOUR = 3600_000;

export async function recordClick(
  ctx: ClickContext,
  input: RecordClickInput,
): Promise<void> {
  if (!ctx.db) return;
  const db = ctx.db;

  const work = (async () => {
    try {
      await db
        .prepare(
          'INSERT INTO clicks (event_key, provider, country, referer, clicked_at)' +
            " VALUES (?, ?, ?, ?, datetime('now'))",
        )
        .bind(
          input.key.slice(0, 16),
          input.provider,
          (input.country ?? '').slice(0, 2).toUpperCase() || null,
          hostOf(input.referer),
        )
        .run();

      if (input.event) {
        // Remembered once so the dashboard can show the event title.
        await db
          .prepare(
            'INSERT INTO events (event_key, title, starts_at, time_zone, created_at)' +
              " VALUES (?, ?, ?, ?, datetime('now')) ON CONFLICT(event_key) DO NOTHING",
          )
          .bind(
            input.key.slice(0, 16),
            input.event.title.slice(0, 200),
            input.event.start,
            input.event.timeZone,
          )
          .run();
      }
    } catch (err) {
      // Analytics must never break a redirect.
      console.error('click write failed', err);
    }
  })();

  if (ctx.waitUntil) ctx.waitUntil(work);
  else await work;
}

export interface StatsRow {
  provider: string;
  clicks: number;
}

export interface Stats {
  key: string;
  title: string | null;
  startsAt: string | null;
  timeZone: string | null;
  total: number;
  byProvider: StatsRow[];
  byDay: { day: string; clicks: number }[];
  byCountry: { country: string; clicks: number }[];
  lastClickAt: string | null;
}

export async function readStats(db: D1Like | undefined, key: string): Promise<Stats | null> {
  if (!db) return null;
  const safe = key.slice(0, 16);

  const [meta, providers, days, countries] = await Promise.all([
    db
      .prepare(
        'SELECT e.title, e.starts_at, e.time_zone,' +
          ' (SELECT COUNT(*) FROM clicks c WHERE c.event_key = ?) AS total,' +
          ' (SELECT MAX(clicked_at) FROM clicks c WHERE c.event_key = ?) AS last_click' +
          ' FROM events e WHERE e.event_key = ?',
      )
      .bind(safe, safe, safe)
      .first<Record<string, unknown>>(),
    db
      .prepare(
        'SELECT provider, COUNT(*) AS clicks FROM clicks WHERE event_key = ?' +
          ' GROUP BY provider ORDER BY clicks DESC',
      )
      .bind(safe)
      .all<{ provider: string; clicks: number }>(),
    db
      .prepare(
        "SELECT date(clicked_at) AS day, COUNT(*) AS clicks FROM clicks WHERE event_key = ?" +
          ' GROUP BY day ORDER BY day DESC LIMIT 30',
      )
      .bind(safe)
      .all<{ day: string; clicks: number }>(),
    db
      .prepare(
        'SELECT COALESCE(country, ?) AS country, COUNT(*) AS clicks FROM clicks' +
          ' WHERE event_key = ? GROUP BY country ORDER BY clicks DESC LIMIT 10',
      )
      .bind('??', safe)
      .all<{ country: string; clicks: number }>(),
  ]);

  const total = Number(meta?.total ?? 0);
  if (!meta && total === 0) {
    return {
      key: safe,
      title: null,
      startsAt: null,
      timeZone: null,
      total: 0,
      byProvider: [],
      byDay: [],
      byCountry: [],
      lastClickAt: null,
    };
  }

  return {
    key: safe,
    title: (meta?.title as string) ?? null,
    startsAt: (meta?.starts_at as string) ?? null,
    timeZone: (meta?.time_zone as string) ?? null,
    total,
    byProvider: providers.results,
    byDay: days.results.reverse(),
    byCountry: countries.results,
    lastClickAt: (meta?.last_click as string) ?? null,
  };
}

/** Keep only the referring host, never the full URL with its query string. */
function hostOf(referer?: string): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).host.slice(0, 120);
  } catch {
    return null;
  }
}

export { HOUR };
