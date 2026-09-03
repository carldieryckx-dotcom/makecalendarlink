import { PROVIDERS, PROVIDER_LABELS, type CalendarEvent, type Provider } from './event';
import { buildLinks } from './links';
import { encodeEvent, eventKey } from './encode';

export interface OutputOptions {
  /** Absolute site origin, e.g. `https://example.com`. No trailing slash. */
  origin: string;
  /** Route clicks through the site so they can be counted. */
  track?: boolean;
  /** Providers to include, in the order they should appear. */
  providers?: Provider[];
}

export interface CalendarTarget {
  provider: Provider;
  label: string;
  /** The link to put in front of a visitor. */
  href: string;
  /** The untracked destination, useful to show alongside. */
  directHref: string;
}

const strip = (origin: string) => origin.replace(/\/+$/, '');

/**
 * Direct links plus, when tracking is on, the equivalent links that pass
 * through `/go/:provider` first so a click can be counted.
 */
export function buildTrackedLinks(
  event: CalendarEvent,
  opts: OutputOptions,
): { key: string; encoded: string; targets: CalendarTarget[] } {
  const origin = strip(opts.origin);
  const wanted = opts.providers ?? [...PROVIDERS];
  const hosted = buildLinks(event);
  const encoded = encodeEvent(event);
  const key = eventKey(event);

  const targets = wanted.map((provider): CalendarTarget => {
    const directHref =
      provider === 'ics'
        ? `${origin}/api/ics?e=${encoded}`
        : hosted[provider as Exclude<Provider, 'ics'>];

    const href = opts.track
      ? `${origin}/go/${provider}?e=${encoded}&k=${key}`
      : directHref;

    return { provider, label: PROVIDER_LABELS[provider], href, directHref };
  });

  return { key, encoded, targets };
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export interface SnippetOptions extends OutputOptions {
  /** Text on the first line of the snippet. */
  heading?: string;
}

/**
 * A plain HTML block of links. No JavaScript, no external CSS, inline styles
 * only, so it survives email clients, newsletter builders and CMS editors.
 */
export function buildEmbedHtml(event: CalendarEvent, opts: SnippetOptions): string {
  const { targets } = buildTrackedLinks(event, opts);
  const heading = opts.heading ?? 'Add to calendar:';

  const links = targets
    .map(
      (t) =>
        `  <a href="${escapeHtml(t.href)}" target="_blank" rel="noopener"` +
        ` style="color:#1d4ed8;text-decoration:underline;margin-right:12px;">${escapeHtml(
          t.label,
        )}</a>`,
    )
    .join('\n');

  return [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;">',
    `  <strong style="display:block;margin-bottom:6px;">${escapeHtml(heading)}</strong>`,
    links,
    '</div>',
  ].join('\n');
}

/** The `<div>` plus `<script>` pair for the interactive dropdown widget. */
export function buildWidgetHtml(event: CalendarEvent, opts: OutputOptions): string {
  const origin = strip(opts.origin);
  const attrs: Array<[string, string | undefined]> = [
    ['data-title', event.title],
    ['data-start', event.start],
    ['data-end', event.end],
    ['data-timezone', event.timeZone],
    ['data-all-day', event.allDay ? 'true' : undefined],
    ['data-location', event.location],
    ['data-description', event.description],
    ['data-url', event.url],
    ['data-track', opts.track ? 'on' : undefined],
  ];

  const rendered = attrs
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `    ${k}="${escapeHtml(String(v))}"`)
    .join('\n');

  return [
    '<div data-add-to-calendar',
    rendered,
    '></div>',
    `<script src="${origin}/embed.js" async defer></script>`,
  ].join('\n');
}
