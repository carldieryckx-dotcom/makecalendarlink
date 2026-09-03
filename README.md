# CalendarButton

A free, open source add to calendar link generator. Fill in an event once, get working links for Google Calendar, Outlook.com, Outlook 365, Yahoo Calendar and Apple Calendar, plus an HTML snippet for newsletters and a drop-in JavaScript widget for websites.

Runs entirely on Cloudflare's free tier. No account, no database for the core feature, no per-event cost.

## Why it exists

Hosted services charge a monthly fee for what is, at bottom, correct URL formatting. That fee buys you real things — RSVPs, ticketing, editable events — but most people asking for an "add to calendar button" need five URLs. This does that part properly and gets out of the way.

## How it works

The event lives inside the link. When you generate a link, the event details are encoded into the URL itself rather than written to a database. Three consequences worth knowing:

- Links never expire, and nothing here can delete them
- No account, no storage, no privacy policy worth reading
- You cannot edit an event after sending the link; you generate a new one

## Quick start

```bash
git clone https://github.com/carldieryckx-dotcom/calendarbutton
cd calendarbutton
npm install
npm run dev
```

Open http://localhost:4321.

## Deploying

Full walkthrough in [DEPLOY.md](./DEPLOY.md), including buying a domain and pointing it at Cloudflare. The short version:

```bash
npx wrangler login
npm run deploy
```

Click counting needs a D1 database. Everything else works without one:

```bash
npx wrangler d1 create calendarbutton   # paste the id into wrangler.jsonc
npm run db:migrate
npm run deploy
```

## Making it yours

Everything brand-specific is in one file, `src/config.ts`:

```ts
export const SITE = {
  name: 'CalendarButton',
  url: 'https://calendarbutton.io',
  tagline: '...',
  repo: 'https://github.com/carldieryckx-dotcom/calendarbutton',
  email: 'hello@calendarbutton.io',
  fallbackTimeZone: 'Europe/Brussels',
};
```

Change those, then update `site` in `astro.config.mjs`, the sitemap host in `public/robots.txt`, and `name` in `wrangler.jsonc`. A test asserts the first three stay in sync, so `npm test` will tell you if you miss one.

## Using the core in your own project

`src/lib/` has no dependencies and runs in the browser, in Node and on Cloudflare Workers. Copy the directory into your project:

```ts
import { buildLinks, buildIcs } from './lib';

const event = {
  title: 'Q4 product webinar',
  start: '2026-09-10T14:00',     // wall-clock time, not UTC
  end: '2026-09-10T15:00',
  timeZone: 'Europe/Brussels',   // IANA zone
  location: 'https://meet.example.com/abc',
  description: 'A 45 minute session.',
};

buildLinks(event);
// { google: '...', outlook: '...', office365: '...', yahoo: '...' }

buildIcs(event);
// 'BEGIN:VCALENDAR\r\n...'
```

There is also a keyless HTTP API at `/api/links` if you would rather not vendor the code. See `/api` on the running site.

## The embed widget

```html
<div data-add-to-calendar
     data-title="Q4 product webinar"
     data-start="2026-09-10T14:00"
     data-end="2026-09-10T15:00"
     data-timezone="Europe/Brussels"></div>

<script src="https://calendarbutton.io/embed.js" async defer></script>
```

Around 4 KB gzipped, no dependencies, renders in a shadow root so host CSS cannot reach it. Full attribute list on the `/embed` page.

## What this gets right

Three things that most hand-rolled generators get wrong, each covered by tests:

**Google timezones.** Sending UTC timestamps together with a `ctz` parameter makes Google Calendar label the event `GMT+00:00`. This sends local wall time plus the zone, which is the combination Google actually wants.

**Exclusive all-day end dates.** An event running 10 to 12 September needs an end of the 13th, in Google, Outlook, Yahoo and iCalendar alike. Off-by-one here is the most common bug in this space.

**iCalendar mechanics.** CRLF line endings, folding at 75 octets, escaping commas and semicolons, a stable UID so a second download updates rather than duplicates.

## Project layout

```
src/
  config.ts            brand and domain, the only file you must edit
  lib/
    time.ts            timezone maths on Intl alone, no date library
    event.ts           event shape, normalisation, validation
    links.ts           per-provider URL builders
    ics.ts             iCalendar generation
    encode.ts          URL-safe event payload and the analytics key
    output.ts          HTML snippet, widget snippet, tracked links
    analytics.ts       D1 click counting and stats queries
    runtime.ts         Cloudflare bindings, the only Workers-only module
  components/          Generator, FAQ
  scripts/generator.ts browser logic for the generator page
  data/                guide and use-case content for the SEO pages
  pages/
    index.astro        the generator
    how-to/[slug]      one guide per provider
    for/[slug]         one page per use case
    api/               JSON API and .ics endpoint
    go/[provider].ts   tracked redirect
    stats/[key].astro  click dashboard
    e/[data].astro     shareable event page
widget/embed.ts        standalone widget, built to public/embed.js
schema.sql             D1 tables for click counting
```

## Tests

```bash
npm test          # 59 tests
npm run typecheck
```

Three suites: URL and iCalendar output against every provider format, the widget in jsdom, and a contract check that the generator markup still matches the ids its script looks up.

## Privacy

The core feature sends nothing to the server. With click counting on, one row is written per click: event key, provider, timestamp, two-letter country, referring hostname. No IP addresses, no user agents, no cookies.

## Contributing

Bug reports and pull requests welcome. If you are fixing a provider URL format, please add a test that pins the exact parameter you changed — those formats drift, and the tests are the only thing that catches it.

## Licence

MIT. Do what you like with it.
