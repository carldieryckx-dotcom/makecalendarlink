import {
  addDays, toDateCompact, toDateIso, toFloatingCompact, toUtcCompact, wallToUtc,
} from './time';
import {
  fullDescription, normalizeEvent, PROVIDERS,
  type CalendarEvent, type NormalizedEvent, type Provider,
} from './event';

/** `2026-09-10T12:00:00Z` */
function toUtcCompactIso(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function qs(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, v);
  }
  return sp.toString();
}

/**
 * Google Calendar.
 * Floating wall-clock times plus `ctz` so Google shows the event in the
 * intended timezone. Sending UTC times with a `ctz` is what makes Google
 * display "GMT+00:00" on an otherwise correct event.
 */
export function googleUrl(ev: NormalizedEvent): string {
  const dates = ev.allDay
    ? `${toDateCompact(ev.startParts)}/${toDateCompact(addDays(ev.endParts, 1))}`
    : `${toFloatingCompact(ev.startParts)}/${toFloatingCompact(ev.endParts)}`;

  return 'https://calendar.google.com/calendar/render?' + qs({
    action: 'TEMPLATE',
    text: ev.title,
    dates,
    ctz: ev.allDay ? undefined : ev.timeZone,
    details: fullDescription(ev) || undefined,
    location: ev.location || undefined,
    recur: ev.rrule ? `RRULE:${ev.rrule}` : undefined,
  });
}

function outlookUrl(ev: NormalizedEvent, host: string): string {
  // Microsoft renders timed events in the viewer's own timezone, so UTC is the
  // most compatible input. All-day events are plain dates with an exclusive end.
  const startdt = ev.allDay
    ? toDateIso(ev.startParts)
    : toUtcCompactIso(wallToUtc(ev.startParts, ev.timeZone));
  const enddt = ev.allDay
    ? toDateIso(addDays(ev.endParts, 1))
    : toUtcCompactIso(wallToUtc(ev.endParts, ev.timeZone));

  return `https://${host}/calendar/0/deeplink/compose?` + qs({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: ev.title,
    startdt,
    enddt,
    allday: ev.allDay ? 'true' : undefined,
    body: fullDescription(ev) || undefined,
    location: ev.location || undefined,
  });
}

/** Personal Outlook.com accounts. */
export function outlookLiveUrl(ev: NormalizedEvent): string {
  return outlookUrl(ev, 'outlook.live.com');
}

/** Work and school Microsoft 365 accounts. */
export function office365Url(ev: NormalizedEvent): string {
  return outlookUrl(ev, 'outlook.office.com');
}

/** Yahoo Calendar. Expects UTC. */
export function yahooUrl(ev: NormalizedEvent): string {
  const base: Record<string, string | undefined> = {
    v: '60',
    title: ev.title,
    desc: fullDescription(ev) || undefined,
    in_loc: ev.location || undefined,
  };

  if (ev.allDay) {
    base.st = toDateCompact(ev.startParts);
    base.et = toDateCompact(addDays(ev.endParts, 1));
    base.dur = 'allday';
  } else {
    base.st = toUtcCompact(wallToUtc(ev.startParts, ev.timeZone));
    base.et = toUtcCompact(wallToUtc(ev.endParts, ev.timeZone));
  }

  return 'https://calendar.yahoo.com/?' + qs(base);
}

/** All the hosted provider links. `ics` is handled separately, it is a file. */
export function buildLinks(input: CalendarEvent): Record<Exclude<Provider, 'ics'>, string> {
  const ev = normalizeEvent(input);
  return {
    google: googleUrl(ev),
    outlook: outlookLiveUrl(ev),
    office365: office365Url(ev),
    yahoo: yahooUrl(ev),
  };
}

export function buildLink(input: CalendarEvent, provider: Exclude<Provider, 'ics'>): string {
  return buildLinks(input)[provider];
}

export { PROVIDERS };
