import { parseNaive, type NaiveParts } from './time';

export const PROVIDERS = ['google', 'outlook', 'office365', 'yahoo', 'ics'] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABELS: Record<Provider, string> = {
  google: 'Google Calendar',
  outlook: 'Outlook.com',
  office365: 'Outlook 365',
  yahoo: 'Yahoo Calendar',
  ics: 'Apple / iCal (.ics)',
};

export interface CalendarEvent {
  /** Event title. Required. */
  title: string;
  /** Wall-clock start: `YYYY-MM-DD` for all-day, `YYYY-MM-DDTHH:mm` otherwise. */
  start: string;
  /** Wall-clock end. For all-day events this is the *inclusive* last day. */
  end: string;
  /** IANA timezone the wall-clock times are expressed in. */
  timeZone: string;
  allDay?: boolean;
  description?: string;
  location?: string;
  /** Appended to the description as a link, since not every provider has a url field. */
  url?: string;
  organizerName?: string;
  organizerEmail?: string;
  /** Raw RRULE without the `RRULE:` prefix, e.g. `FREQ=WEEKLY;COUNT=8`. */
  rrule?: string;
  /** Minutes before start for the .ics alarm. */
  reminderMinutes?: number;
}

export interface NormalizedEvent extends CalendarEvent {
  allDay: boolean;
  startParts: NaiveParts;
  endParts: NaiveParts;
}

export function normalizeEvent(input: CalendarEvent): NormalizedEvent {
  if (!input.title || !input.title.trim()) throw new Error('An event needs a title.');
  if (!input.start) throw new Error('An event needs a start date.');
  if (!input.timeZone) throw new Error('An event needs a timezone.');

  const startParts = parseNaive(input.start);
  const allDay = input.allDay ?? !startParts.hasTime;
  const endParts = parseNaive(input.end || input.start);

  const startMs = Date.UTC(
    startParts.year, startParts.month - 1, startParts.day,
    startParts.hour, startParts.minute, startParts.second,
  );
  const endMs = Date.UTC(
    endParts.year, endParts.month - 1, endParts.day,
    endParts.hour, endParts.minute, endParts.second,
  );
  if (endMs < startMs) throw new Error('The end of the event is before its start.');

  return { ...input, allDay, startParts, endParts };
}

/** Description plus the event url, since Yahoo and Outlook have no separate url field. */
export function fullDescription(e: CalendarEvent): string {
  const parts: string[] = [];
  if (e.description?.trim()) parts.push(e.description.trim());
  if (e.url?.trim()) parts.push(e.url.trim());
  return parts.join('\n\n');
}
