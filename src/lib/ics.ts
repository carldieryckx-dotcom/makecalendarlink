import { addDays, toDateCompact, toFloatingCompact, toUtcCompact, wallToUtc } from './time';
import { fullDescription, normalizeEvent, type CalendarEvent } from './event';

/** RFC 5545 text escaping. */
function esc(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Fold lines at 75 octets as the spec requires. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    chunks.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest) chunks.push(' ' + rest);
  return chunks.join('\r\n');
}

/** Deterministic-ish UID so re-downloading updates the same event. */
function uid(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${(h >>> 0).toString(36)}@calendar-link`;
}

export interface IcsOptions {
  /** Product identifier written into PRODID. */
  prodId?: string;
  /** Fixed DTSTAMP, handy for tests. */
  now?: Date;
}

export function buildIcs(input: CalendarEvent, opts: IcsOptions = {}): string {
  const ev = normalizeEvent(input);
  const now = opts.now ?? new Date();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${opts.prodId ?? 'Calendar Link'}//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid(`${ev.title}${ev.start}${ev.end}${ev.timeZone}`)}`,
    `DTSTAMP:${toUtcCompact(now)}`,
    `SUMMARY:${esc(ev.title)}`,
  ];

  if (ev.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${toDateCompact(ev.startParts)}`);
    lines.push(`DTEND;VALUE=DATE:${toDateCompact(addDays(ev.endParts, 1))}`);
  } else {
    // TZID keeps the event at the intended local time in Apple Calendar and Outlook.
    lines.push(`DTSTART;TZID=${ev.timeZone}:${toFloatingCompact(ev.startParts)}`);
    lines.push(`DTEND;TZID=${ev.timeZone}:${toFloatingCompact(ev.endParts)}`);
    // UTC duplicate for the few clients that ignore TZID without a VTIMEZONE block.
    lines.push(`X-WR-TIMEZONE:${ev.timeZone}`);
  }

  const desc = fullDescription(ev);
  if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
  if (ev.location) lines.push(`LOCATION:${esc(ev.location)}`);
  if (ev.url) lines.push(`URL:${ev.url}`);
  if (ev.rrule) lines.push(`RRULE:${ev.rrule}`);
  if (ev.organizerEmail) {
    const cn = ev.organizerName ? `;CN=${esc(ev.organizerName)}` : '';
    lines.push(`ORGANIZER${cn}:mailto:${ev.organizerEmail}`);
  }
  lines.push('SEQUENCE:0', 'STATUS:CONFIRMED', 'TRANSP:OPAQUE');

  if (ev.reminderMinutes && ev.reminderMinutes > 0) {
    lines.push(
      'BEGIN:VALARM',
      `TRIGGER:-PT${Math.round(ev.reminderMinutes)}M`,
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(ev.title)}`,
      'END:VALARM',
    );
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Filename-safe .ics name derived from the title. */
export function icsFilename(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `${slug || 'event'}.ics`;
}

/** Browser-only: trigger a download without a server round trip. */
export function downloadIcs(input: CalendarEvent): void {
  const blob = new Blob([buildIcs(input)], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = icsFilename(input.title);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export { wallToUtc };
