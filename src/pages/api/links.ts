import type { APIRoute } from 'astro';
import { buildTrackedLinks } from '../../lib/output';
import { buildIcs } from '../../lib/ics';
import { decodeEvent, encodeEvent, eventKey } from '../../lib/encode';
import type { CalendarEvent } from '../../lib/event';
import { SITE } from '../../config';

export const prerender = false;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS },
  });

export const OPTIONS: APIRoute = async () => new Response(null, { status: 204, headers: CORS });

/**
 * Public, keyless JSON API.
 *
 *   GET  /api/links?title=Demo&start=2026-09-10T14:00&end=2026-09-10T15:00&timeZone=Europe/Brussels
 *   GET  /api/links?e=<payload>
 *   POST /api/links   { "title": "...", "start": "...", "end": "...", "timeZone": "..." }
 */
export const GET: APIRoute = async ({ request }) => {
  const params = new URL(request.url).searchParams;

  try {
    const event = params.get('e')
      ? decodeEvent(params.get('e')!)
      : ({
          title: params.get('title') ?? '',
          start: params.get('start') ?? '',
          end: params.get('end') ?? params.get('start') ?? '',
          timeZone: params.get('timeZone') ?? params.get('tz') ?? 'UTC',
          allDay: params.get('allDay') === 'true' || undefined,
          location: params.get('location') ?? undefined,
          description: params.get('description') ?? undefined,
          url: params.get('url') ?? undefined,
          rrule: params.get('rrule') ?? undefined,
        } satisfies CalendarEvent);

    return json(respond(event, params.get('track') === 'true', params.has('ics')));
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Invalid request.' }, 400);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as CalendarEvent & { track?: boolean; ics?: boolean };
    return json(respond(body, body.track === true, body.ics === true));
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Invalid JSON body.' }, 400);
  }
};

function respond(event: CalendarEvent, track: boolean, withIcs: boolean) {
  const { targets, encoded } = buildTrackedLinks(event, { origin: SITE.url, track });
  const links = Object.fromEntries(targets.map((t) => [t.provider, t.href]));

  return {
    key: eventKey(event),
    encoded,
    links,
    icsUrl: `${SITE.url}/api/ics?e=${encoded}`,
    shareUrl: `${SITE.url}/e/${encoded}`,
    ...(withIcs ? { ics: buildIcs(event, { prodId: SITE.name }) } : {}),
    ...(track ? { statsUrl: `${SITE.url}/stats/${eventKey(event)}` } : {}),
    _note: `${SITE.name} is free and open source. No key, no rate limit games. ${SITE.repo}`,
    _echo: { ...event, encoded: undefined },
  };
}

export { encodeEvent };
