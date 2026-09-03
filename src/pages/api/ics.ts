import type { APIRoute } from 'astro';
import { buildIcs, icsFilename } from '../../lib/ics';
import { decodeEvent } from '../../lib/encode';
import { SITE } from '../../config';

export const prerender = false;

/**
 * `/api/ics?e=<payload>` returns a downloadable .ics file.
 *
 * A hosted file beats a data: URI here, because iOS Mail and several Android
 * clients refuse to open data URIs but happily open a text/calendar response.
 */
export const GET: APIRoute = async ({ request }) => {
  const payload = new URL(request.url).searchParams.get('e');
  if (!payload) {
    return new Response('Missing event payload.', { status: 400 });
  }

  try {
    const event = decodeEvent(payload);
    return new Response(buildIcs(event, { prodId: SITE.name }), {
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'content-disposition': `attachment; filename="${icsFilename(event.title)}"`,
        // The payload fully determines the file, so it can cache hard.
        'cache-control': 'public, max-age=31536000, immutable',
        'access-control-allow-origin': '*',
      },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : 'Invalid event payload.', {
      status: 400,
    });
  }
};
