import type { APIRoute } from 'astro';
import { PROVIDERS, type Provider } from '../../lib/event';
import { buildLinks } from '../../lib/links';
import { buildIcs, icsFilename } from '../../lib/ics';
import { decodeEvent, eventKey } from '../../lib/encode';
import { recordClick } from '../../lib/analytics';
import { getDb, getWaitUntil } from '../../lib/runtime';
import { SITE } from '../../config';

export const prerender = false;

/**
 * Tracked redirect. `/go/google?e=<payload>&k=<key>` counts the click and
 * forwards to the real calendar. `/go/ics` returns the file directly.
 *
 * The event lives entirely in the payload, so this route works even when the
 * D1 binding is missing: it just skips the counting.
 */
export const GET: APIRoute = async ({ params, request, locals, redirect }) => {
  const provider = params.provider as Provider;
  if (!PROVIDERS.includes(provider)) {
    return new Response('Unknown calendar provider.', { status: 404 });
  }

  const url = new URL(request.url);
  const payload = url.searchParams.get('e');
  if (!payload) return redirect('/', 302);

  let event;
  try {
    event = decodeEvent(payload);
  } catch {
    return new Response('This calendar link is no longer valid.', { status: 400 });
  }

  await recordClick(
    { db: getDb(), waitUntil: getWaitUntil(locals) },
    {
      key: url.searchParams.get('k') || eventKey(event),
      provider,
      country: request.headers.get('cf-ipcountry') ?? undefined,
      referer: request.headers.get('referer') ?? undefined,
      event,
    },
  );

  if (provider === 'ics') {
    return new Response(buildIcs(event, { prodId: SITE.name }), {
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'content-disposition': `attachment; filename="${icsFilename(event.title)}"`,
        'cache-control': 'no-store',
      },
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      location: buildLinks(event)[provider as Exclude<Provider, 'ics'>],
      'cache-control': 'no-store',
      // Do not leak the host page URL to Google or Microsoft.
      'referrer-policy': 'no-referrer',
    },
  });
};
