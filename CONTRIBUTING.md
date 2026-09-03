# Contributing

Thanks for looking. This is a small project and pull requests are genuinely welcome.

## Getting set up

```bash
npm install
npm run dev      # http://localhost:4321
npm test
```

Node 20 or newer. No other tooling needed.

## The one rule

**A change to a provider URL format needs a test pinning the exact parameter you changed.**

Calendar providers change their URL formats without notice and without a changelog. The test suite is the only thing standing between a silent break and a lot of events landing at the wrong hour. If you fix an Outlook route, add an assertion on that route.

```ts
it('uses the new deeplink path', () => {
  const url = new URL(buildLinks(event).outlook);
  expect(url.pathname).toBe('/calendar/0/deeplink/compose');
});
```

## Where things live

Read the project layout section in the README first. Two boundaries matter:

- **`src/lib/` stays dependency-free** and must run in the browser, in Node and on Workers. No Node built-ins, no `window` assumptions. The one exception is `runtime.ts`, which imports `cloudflare:workers` and is imported only by route files.
- **`widget/embed.ts` is a separate bundle.** It may import from `src/lib/`, never the other way round. Keep it small; it goes on other people's sites.

## Reporting a broken calendar link

Please include:

1. The full generated URL
2. Which provider and which account type (personal Outlook.com or a work Microsoft 365 account, for instance)
3. What you expected and what the calendar actually showed, with timezones
4. Your browser and operating system

Timezone bugs are the hard ones and they are nearly impossible to reproduce without the exact URL.

## Adding a calendar provider

1. Add the id to `PROVIDERS` and a label to `PROVIDER_LABELS` in `src/lib/event.ts`
2. Write the URL builder in `src/lib/links.ts` and export it
3. Add it to `buildLinks`
4. Add tests: a timed event, an all-day event, and a DST case if the provider takes a timezone
5. Add the redirect case in `src/pages/go/[provider].ts` if it needs anything special
6. Consider a guide page in `src/data/guides.ts`

## Style

- Prettier defaults, single quotes, semicolons
- Comments explain *why*, not *what*. A comment restating the code will be asked about in review
- No new dependencies in `src/lib/` without a good argument

## Content changes

The guide and use-case pages in `src/data/` are part of the project, not filler. If you spot something inaccurate there, a correction is as valuable as a code fix. Keep the tone plain and skip the marketing adjectives.

## Licence

By contributing you agree your work is released under the MIT licence.
