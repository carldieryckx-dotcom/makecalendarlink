/**
 * Public surface of the calendar-link core.
 *
 * Everything here is dependency-free and runs unchanged in the browser,
 * in Node and on Cloudflare Workers.
 */
export type { CalendarEvent, NormalizedEvent, Provider } from './event';
export { PROVIDERS, PROVIDER_LABELS, normalizeEvent, fullDescription } from './event';
export {
  buildLink,
  buildLinks,
  googleUrl,
  outlookLiveUrl,
  office365Url,
  yahooUrl,
} from './links';
export { buildIcs, icsFilename, downloadIcs } from './ics';
export { encodeEvent, decodeEvent, eventKey } from './encode';
export {
  browserTimeZone,
  supportedTimeZones,
  wallToUtc,
  formatWallTime,
  prettyZone,
} from './time';
export { buildTrackedLinks, buildEmbedHtml } from './output';
