import { describe, expect, it } from 'vitest';
import { buildLinks, googleUrl } from './links';
import { buildIcs, icsFilename } from './ics';
import { normalizeEvent, type CalendarEvent } from './event';
import { decodeEvent, encodeEvent, eventKey } from './encode';
import {
  formatWallTime,
  isoOffset,
  parseNaive,
  prettyZone,
  toUtcCompact,
  wallToUtc,
} from './time';
import { buildEmbedHtml, buildTrackedLinks } from './output';

const summer: CalendarEvent = {
  title: 'Product webinar',
  start: '2026-07-15T14:00',
  end: '2026-07-15T15:30',
  timeZone: 'Europe/Brussels',
  location: 'https://meet.example.com/abc',
  description: 'A 90 minute walkthrough.',
};

const winter: CalendarEvent = { ...summer, start: '2026-01-15T14:00', end: '2026-01-15T15:30' };

const allDay: CalendarEvent = {
  title: 'Team offsite',
  start: '2026-09-10',
  end: '2026-09-12',
  timeZone: 'Europe/Brussels',
  allDay: true,
};

describe('time', () => {
  it('parses date-only and date-time strings', () => {
    expect(parseNaive('2026-09-10').hasTime).toBe(false);
    expect(parseNaive('2026-09-10T14:05').hour).toBe(14);
    expect(parseNaive('2026-09-10T14:05:09').second).toBe(9);
    expect(() => parseNaive('10/09/2026')).toThrow();
  });

  it('converts wall time to UTC across DST', () => {
    // CEST, UTC+2
    expect(toUtcCompact(wallToUtc('2026-07-15T14:00', 'Europe/Brussels'))).toBe('20260715T120000Z');
    // CET, UTC+1
    expect(toUtcCompact(wallToUtc('2026-01-15T14:00', 'Europe/Brussels'))).toBe('20260115T130000Z');
    // Southern hemisphere, and a half-hour zone
    expect(toUtcCompact(wallToUtc('2026-07-15T14:00', 'Australia/Adelaide'))).toBe(
      '20260715T043000Z',
    );
    expect(toUtcCompact(wallToUtc('2026-07-15T14:00', 'UTC'))).toBe('20260715T140000Z');
  });

  it('formats a wall time as the numbers the user typed', () => {
    // Regression: building `new Date(start + 'Z')` and formatting it in the
    // event zone shifted the label by the offset, so 14:00 Brussels read as
    // 16:00 and an all-day event in a negative-offset zone read a day early.
    expect(formatWallTime('2026-10-15T14:00', { locale: 'en-GB' })).toContain('14:00');
    expect(formatWallTime('2026-10-15T14:00', { locale: 'en-GB' })).toContain('15 October 2026');
    expect(formatWallTime('2026-01-15T09:05', { locale: 'en-GB' })).toContain('09:05');
    expect(formatWallTime('2026-10-15T23:30', { locale: 'en-GB' })).toContain('23:30');
  });

  it('formats an all-day wall time on the right calendar day', () => {
    const label = formatWallTime('2026-10-15', { locale: 'en-GB', allDay: true });
    expect(label).toContain('15 October 2026');
    expect(label).not.toContain('14 October');
    expect(label).not.toMatch(/\d{2}:\d{2}/);
  });

  it('never shifts a label by the zone offset', () => {
    // The label must not depend on the timezone at all: it is the typed time.
    for (const zone of ['UTC', 'Europe/Brussels', 'America/New_York', 'Pacific/Auckland']) {
      const links = buildLinks({ ...summer, timeZone: zone });
      expect(links.google).toContain('20260715T140000');
      expect(formatWallTime('2026-07-15T14:00', { locale: 'en-GB' })).toContain('14:00');
    }
  });

  it('prettifies zone names', () => {
    expect(prettyZone('America/New_York')).toBe('America/New York');
    expect(prettyZone('UTC')).toBe('UTC');
  });

  it('formats ISO offsets', () => {
    expect(isoOffset(parseNaive('2026-07-15T14:00'), 'Europe/Brussels')).toBe('+02:00');
    expect(isoOffset(parseNaive('2026-01-15T14:00'), 'Europe/Brussels')).toBe('+01:00');
    expect(isoOffset(parseNaive('2026-07-15T14:00'), 'America/New_York')).toBe('-04:00');
    expect(isoOffset(parseNaive('2026-07-15T14:00'), 'Asia/Kolkata')).toBe('+05:30');
  });
});

describe('validation', () => {
  it('rejects an event without a title', () => {
    expect(() => normalizeEvent({ ...summer, title: '' })).toThrow(/title/i);
  });

  it('rejects an end before the start', () => {
    expect(() => normalizeEvent({ ...summer, end: '2026-07-15T13:00' })).toThrow(/before/i);
  });

  it('treats a date-only start as all-day', () => {
    expect(normalizeEvent({ ...allDay, allDay: undefined }).allDay).toBe(true);
  });
});

describe('google', () => {
  it('sends floating local time plus ctz, never UTC plus ctz', () => {
    const url = new URL(googleUrl(normalizeEvent(summer)));
    expect(url.searchParams.get('dates')).toBe('20260715T140000/20260715T153000');
    expect(url.searchParams.get('ctz')).toBe('Europe/Brussels');
    expect(url.searchParams.get('dates')).not.toContain('Z');
  });

  it('uses an exclusive end date for all-day events and drops ctz', () => {
    const url = new URL(googleUrl(normalizeEvent(allDay)));
    expect(url.searchParams.get('dates')).toBe('20260910/20260913');
    expect(url.searchParams.get('ctz')).toBeNull();
  });

  it('carries title, details and location', () => {
    const url = new URL(googleUrl(normalizeEvent({ ...summer, url: 'https://example.com/e' })));
    expect(url.searchParams.get('text')).toBe('Product webinar');
    expect(url.searchParams.get('location')).toBe('https://meet.example.com/abc');
    expect(url.searchParams.get('details')).toContain('https://example.com/e');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
  });

  it('passes a recurrence rule', () => {
    const url = new URL(googleUrl(normalizeEvent({ ...summer, rrule: 'FREQ=WEEKLY;COUNT=4' })));
    expect(url.searchParams.get('recur')).toBe('RRULE:FREQ=WEEKLY;COUNT=4');
  });
});

describe('outlook and office 365', () => {
  it('uses UTC instants so the viewer sees their own local time', () => {
    const url = new URL(buildLinks(summer).outlook);
    expect(url.hostname).toBe('outlook.live.com');
    expect(url.searchParams.get('startdt')).toBe('2026-07-15T12:00:00Z');
    expect(url.searchParams.get('enddt')).toBe('2026-07-15T13:30:00Z');
    expect(url.searchParams.get('rru')).toBe('addevent');
    expect(url.searchParams.get('path')).toBe('/calendar/action/compose');
  });

  it('shifts with DST', () => {
    expect(new URL(buildLinks(winter).outlook).searchParams.get('startdt')).toBe(
      '2026-01-15T13:00:00Z',
    );
  });

  it('points work accounts at outlook.office.com', () => {
    expect(new URL(buildLinks(summer).office365).hostname).toBe('outlook.office.com');
  });

  it('uses plain dates and allday for all-day events', () => {
    const url = new URL(buildLinks(allDay).outlook);
    expect(url.searchParams.get('startdt')).toBe('2026-09-10');
    expect(url.searchParams.get('enddt')).toBe('2026-09-13');
    expect(url.searchParams.get('allday')).toBe('true');
  });
});

describe('yahoo', () => {
  it('uses UTC compact stamps', () => {
    const url = new URL(buildLinks(summer).yahoo);
    expect(url.searchParams.get('st')).toBe('20260715T120000Z');
    expect(url.searchParams.get('et')).toBe('20260715T133000Z');
    expect(url.searchParams.get('v')).toBe('60');
  });

  it('marks all-day events', () => {
    const url = new URL(buildLinks(allDay).yahoo);
    expect(url.searchParams.get('dur')).toBe('allday');
    expect(url.searchParams.get('st')).toBe('20260910');
  });
});

describe('ics', () => {
  const ics = buildIcs(summer, { now: new Date('2026-06-01T00:00:00Z') });

  it('is a well formed VCALENDAR with CRLF line endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('VERSION:2.0');
    expect(ics.split('\n').every((l) => l === '' || l.endsWith('\r'))).toBe(true);
  });

  it('keeps local time with a TZID rather than converting to UTC', () => {
    expect(ics).toContain('DTSTART;TZID=Europe/Brussels:20260715T140000');
    expect(ics).toContain('DTEND;TZID=Europe/Brussels:20260715T153000');
  });

  it('escapes commas, semicolons and newlines', () => {
    const out = buildIcs({ ...summer, title: 'Launch, part 1; final', description: 'a\nb' });
    expect(out).toContain('SUMMARY:Launch\\, part 1\\; final');
    expect(out).toContain('DESCRIPTION:a\\nb');
  });

  it('folds long lines at 75 octets', () => {
    const out = buildIcs({ ...summer, description: 'x'.repeat(300) });
    const tooLong = out.split('\r\n').filter((l) => l.length > 75);
    expect(tooLong).toEqual([]);
  });

  it('writes date values and an exclusive end for all-day events', () => {
    const out = buildIcs(allDay);
    expect(out).toContain('DTSTART;VALUE=DATE:20260910');
    expect(out).toContain('DTEND;VALUE=DATE:20260913');
  });

  it('adds a VALARM when a reminder is set', () => {
    const out = buildIcs({ ...summer, reminderMinutes: 30 });
    expect(out).toContain('BEGIN:VALARM');
    expect(out).toContain('TRIGGER:-PT30M');
  });

  it('derives a safe filename', () => {
    expect(icsFilename('Product webinar!')).toBe('product-webinar.ics');
    expect(icsFilename('')).toBe('event.ics');
  });
});

describe('encoding', () => {
  it('round-trips an event', () => {
    const full: CalendarEvent = {
      ...summer,
      url: 'https://example.com/e',
      organizerName: 'Carl',
      organizerEmail: 'carl@example.com',
      reminderMinutes: 15,
      rrule: 'FREQ=WEEKLY;COUNT=3',
    };
    expect(decodeEvent(encodeEvent(full))).toEqual(full);
  });

  it('survives unicode and emoji', () => {
    const e = { ...summer, title: 'Café ☕ overleg — deel 2', description: 'héllo wörld' };
    expect(decodeEvent(encodeEvent(e)).title).toBe('Café ☕ overleg — deel 2');
  });

  it('produces url-safe output', () => {
    expect(encodeEvent(summer)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('rejects corrupted payloads', () => {
    expect(() => decodeEvent('not-base64-json')).toThrow();
  });

  it('gives a stable 10 character key per event', () => {
    const key = eventKey(summer);
    expect(key).toHaveLength(10);
    expect(eventKey(summer)).toBe(key);
    expect(eventKey({ ...summer, title: 'Other' })).not.toBe(key);
  });
});

describe('output', () => {
  it('routes tracked links through the site and keeps the direct target', () => {
    const { targets, key } = buildTrackedLinks(summer, {
      origin: 'https://example.com/',
      track: true,
    });
    const google = targets.find((t) => t.provider === 'google')!;
    expect(google.href).toBe(`https://example.com/go/google?e=${encodeEvent(summer)}&k=${key}`);
    expect(google.directHref).toContain('calendar.google.com');
    expect(targets.find((t) => t.provider === 'ics')!.directHref).toContain('/api/ics?e=');
    expect(targets).toHaveLength(5);
  });

  it('uses direct links when tracking is off', () => {
    const { targets } = buildTrackedLinks(summer, { origin: 'https://example.com' });
    expect(targets[0].href).toBe(targets[0].directHref);
  });

  it('builds an email-safe html snippet', () => {
    const html = buildEmbedHtml(summer, { origin: 'https://example.com' });
    expect(html).toContain('Add to calendar:');
    expect(html).toContain('Google Calendar');
    expect(html).not.toContain('<script');
    expect(html).toContain('style=');
    expect(html.match(/<a /g)).toHaveLength(5);
  });

  it('escapes html in event fields', () => {
    const html = buildEmbedHtml({ ...summer, title: '<img onerror=1>' }, {
      origin: 'https://example.com',
      heading: '<b>x</b>',
    });
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
