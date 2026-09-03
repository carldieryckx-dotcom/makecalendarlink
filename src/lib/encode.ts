import type { CalendarEvent } from './event';

/** Short keys keep the payload compact enough for email clients and QR codes. */
const KEYS = {
  t: 'title',
  s: 'start',
  e: 'end',
  z: 'timeZone',
  a: 'allDay',
  d: 'description',
  l: 'location',
  u: 'url',
  n: 'organizerName',
  m: 'organizerEmail',
  r: 'rrule',
  b: 'reminderMinutes',
} as const satisfies Record<string, keyof CalendarEvent>;

const REVERSE = Object.fromEntries(
  Object.entries(KEYS).map(([short, long]) => [long, short]),
) as Record<string, string>;

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 =
    typeof btoa === 'function' ? btoa(bin) : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  if (typeof atob === 'function') {
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(padded, 'base64'));
}

/** Pack an event into a URL-safe string, so no database is needed. */
export function encodeEvent(event: CalendarEvent): string {
  const compact: Record<string, unknown> = {};
  for (const [long, value] of Object.entries(event)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    const short = REVERSE[long];
    if (short) compact[short] = value;
  }
  const json = JSON.stringify(compact);
  return toBase64Url(new TextEncoder().encode(json));
}

export function decodeEvent(encoded: string): CalendarEvent {
  const json = new TextDecoder().decode(fromBase64Url(encoded));
  const compact = JSON.parse(json) as Record<string, unknown>;
  const event: Record<string, unknown> = {};
  for (const [short, value] of Object.entries(compact)) {
    const long = (KEYS as Record<string, string>)[short];
    if (long) event[long] = value;
  }
  if (!event.title || !event.start || !event.timeZone) {
    throw new Error('This calendar link is incomplete or corrupted.');
  }
  if (!event.end) event.end = event.start;
  return event as unknown as CalendarEvent;
}

/**
 * Deterministic 10-character key for an event, used to group click analytics.
 * The same event details always produce the same key, so creating a link never
 * needs a database write. FNV-1a run twice with different offsets.
 */
export function eventKey(event: CalendarEvent): string {
  const seed = [
    event.title,
    event.start,
    event.end,
    event.timeZone,
    event.location ?? '',
    event.description ?? '',
  ].join(' ');

  const fnv = (offset: number) => {
    let h = offset;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  };

  return (fnv(2166136261) + fnv(1099511628)).padEnd(10, '0').slice(0, 10);
}
