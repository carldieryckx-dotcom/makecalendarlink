# Deploying from zero

Written for someone with no server, no domain and no Cloudflare account. Around 45 minutes end to end, most of it waiting for DNS.

Total running cost: the domain. Everything else fits in Cloudflare's free tier, which as of September 2026 covers 100,000 Worker requests per day, and for the click database 5 million row reads and 100,000 row writes per day. This site does zero database work unless someone clicks a tracked link, so the request limit is the one that matters, and 100k/day is a lot of traffic for a tool like this.

---

## 1. Pick a name

Two things matter more than cleverness here, because paid search and organic search both reward the boring option:

- **Keyword in the domain still helps a little, and helps the ad more.** A domain containing "calendar" gets a better click-through rate on a search for "add to calendar link" than an invented word does, because the URL is visible in the result.
- **`.com` if you can get it, then `.io`, `.app` or `.link`.** People type `.com` out of habit and land on someone else's site.

Check availability at https://domains.cloudflare.com. A `.com` runs about $10-11 a year at cost there, no renewal markup. Candidate shapes, in descending order of how well they tend to work:

| Shape | Examples |
| --- | --- |
| Keyword + short suffix | `calendarbutton.io`, `addtocal.com`, `calendarbutton.com` |
| Two-word literal | `addtocalendar.link`, `eventtocalendar.com` |
| Invented | `calndrly.com`, `kalendo.app` |

Avoid hyphens, numbers, and anything you have to spell out loud twice.

If you buy the domain elsewhere, that is fine too. You will point its nameservers at Cloudflare in step 3.

---

## 2. Create the Cloudflare account

1. Sign up at https://dash.cloudflare.com/sign-up
2. Verify the email
3. Turn on two-factor authentication straight away, under My Profile then Authentication. This account will own your domain, so treat it like a bank login.

No card is needed for the free tier. You will add one to buy the domain.

---

## 3. Get the domain onto Cloudflare

**If you buy it at Cloudflare:** Dashboard, Domain Registration, Register Domains. Search, buy, done. DNS is configured automatically and there is nothing else to do.

**If you already own it elsewhere:** Dashboard, Add a site, enter the domain, choose the Free plan. Cloudflare shows you two nameservers. Set those at your current registrar, replacing whatever is there. Propagation usually takes under an hour, occasionally up to 24. You can carry on with the next steps while you wait.

---

## 4. Put the code on GitHub

Skip this if you only want to deploy from your laptop, but do it anyway: it is what makes the project open source, and it gives you deploys on every push.

```bash
cd calendar-link-tool
git init
git add .
git commit -m "Initial commit"
gh repo create calendarbutton --public --source=. --push
```

Without the `gh` CLI: create an empty public repository on github.com, then

```bash
git remote add origin https://github.com/<you>/calendarbutton.git
git branch -M main
git push -u origin main
```

---

## 5. Set your own name and domain

Edit `src/config.ts`:

```ts
export const SITE = {
  name: 'CalendarButton',                                   // your product name
  url: 'https://calendarbutton.io',                          // your domain, no trailing slash
  tagline: 'Free add to calendar links for ...',
  repo: 'https://github.com/<you>/calendarbutton',
  email: 'hello@calendarbutton.io',
  fallbackTimeZone: 'Europe/Brussels',
};
```

Then three more places, which `npm test` checks for you:

- `astro.config.mjs` — the `site` constant at the top
- `public/robots.txt` — the `Sitemap:` line
- `wrangler.jsonc` — `name`, which becomes your worker's subdomain

```bash
npm test        # fails loudly if any of them disagree
```

---

## 6. First deploy

```bash
npm install
npx wrangler login          # opens a browser, authorises the CLI
npm run deploy
```

You get a URL like `https://calendarbutton.<your-subdomain>.workers.dev`. Open it and check the generator works end to end: fill in an event, generate, click the Google link, confirm the event appears at the hour you typed.

---

## 7. Point your domain at it

Dashboard, Workers & Pages, your worker, Settings, Domains & Routes, Add, Custom domain.

Add both:

- `calendarbutton.io`
- `www.calendarbutton.io`

Cloudflare creates the DNS records and issues the TLS certificate. Live within a couple of minutes.

Then make one of them canonical, so search engines do not see two copies of the site. Dashboard, Rules, Redirect Rules, Create rule:

- **If** hostname equals `www.calendarbutton.io`
- **Then** dynamic redirect, 301, expression `concat("https://calendarbutton.io", http.request.uri.path)`

---

## 8. Turn on click counting

Optional. Skip it and the site works fine; the dashboard page just says tracking is not configured.

```bash
npx wrangler d1 create calendarbutton
```

It prints a `database_id`. Paste it into `wrangler.jsonc`, replacing `PASTE_YOUR_DATABASE_ID_HERE`. Then:

```bash
npm run db:migrate      # creates the tables on the remote database
npm run deploy
```

Test it: generate a link with "Count clicks" ticked, click it, then open the dashboard URL. The number should be 1.

For local development the tables live in a separate local database:

```bash
npm run build
npx wrangler d1 execute calendarbutton -c dist/server/wrangler.json --local --file=./schema.sql
npm run preview
```

---

## 9. Automatic deploys on push

Dashboard, Workers & Pages, Create, Import a repository. Pick your GitHub repo and set:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy -c dist/server/wrangler.json`

Every push to `main` now deploys. Pull requests get their own preview URL, which is genuinely useful before you touch the live copy.

---

## 10. Tell Google it exists

1. https://search.google.com/search-console, add a Domain property
2. Verify with the DNS TXT record it gives you. Cloudflare dashboard, DNS, Records, Add record, type TXT
3. Sitemaps, submit `sitemap-index.xml`
4. URL Inspection, paste your homepage, Request indexing

Then repeat for Bing at https://www.bing.com/webmasters. Bing feeds several other engines and takes ten minutes.

Expect nothing for two to three weeks. New domains sit in a holding pattern regardless of how good the site is.

---

## 11. Before you spend anything on ads

Check all of these first. Sending paid traffic at a broken page is the most expensive mistake available.

- [ ] The homepage generator works on a phone
- [ ] A generated Google link creates the event at the right hour
- [ ] The same for Outlook.com, Outlook 365 and Yahoo
- [ ] The `.ics` file opens natively on an iPhone
- [ ] The `.ics` file opens in Outlook desktop on Windows
- [ ] An all-day event spanning three days lands on three days, not four
- [ ] The HTML snippet renders in a real Gmail message
- [ ] The widget works on a test WordPress page
- [ ] `https://yourdomain.com/robots.txt` and `/sitemap-index.xml` both load
- [ ] The site scores green on PageSpeed Insights
- [ ] Search Console shows the homepage as indexed

The marketing plan lives next to this file: see `../CalendarButton - SEO en AdWords playbook.md` in the vault.

---

## Troubleshooting

**`Missing entry-point` on deploy.** You ran `wrangler deploy` without the config flag. Use `npm run deploy`, which passes `-c dist/server/wrangler.json`.

**Stats page says tracking is not configured.** The `database_id` in `wrangler.jsonc` is still the placeholder, or you deployed before pasting it.

**`no such table: clicks`.** You created the database but skipped `npm run db:migrate`.

**Custom domain stuck on "Initializing".** The nameservers are not pointing at Cloudflare yet. Check at https://dnschecker.org.

**Google Calendar shows GMT+00:00.** Not possible with this codebase, which sends local time plus `ctz`. If you see it, you are testing a link from a different tool.

**Build fails on `@apply` in a component.** Tailwind 4 needs an `@reference` directive for scoped styles. Put the class in `src/styles/global.css` instead; a test guards against this.
