/**
 * Contract tests between the generator script and its markup.
 *
 * The script looks elements up by id. Renaming an id in the component would
 * break the page at runtime with nothing failing at build time, so these tests
 * read both files and check they still agree.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

const script = read('../scripts/generator.ts');
const component = read('../components/Generator.astro');

/** Every id the script resolves through its `el()` helper. */
const requestedIds = [
  ...new Set([...script.matchAll(/\bel(?:<[^>]*>)?\('([^']+)'\)/g)].map((m) => m[1]!)),
];

/** Every id present in the markup. */
const markupIds = new Set(
  [...component.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]!),
);

describe('generator markup contract', () => {
  it('finds ids to check', () => {
    expect(requestedIds.length).toBeGreaterThanOrEqual(15);
    expect(markupIds.size).toBeGreaterThanOrEqual(15);
  });

  it('every id the script looks up exists in the markup', () => {
    const missing = requestedIds.filter((id) => !markupIds.has(id));
    expect(missing).toEqual([]);
  });

  it('the form fields the script reads are all present', () => {
    for (const id of [
      'f-title',
      'f-start-date',
      'f-start-time',
      'f-end-date',
      'f-end-time',
      'f-timezone',
      'f-allday',
      'f-location',
      'f-description',
      'f-url',
      'f-repeat',
      'f-count',
      'f-reminder',
      'f-organizer',
      'f-track',
    ]) {
      expect(markupIds.has(id), `missing #${id}`).toBe(true);
    }
  });

  it('has an error message target for every field the script can flag', () => {
    const flagged = [
      ...new Set([...script.matchAll(/showError\('([^']+)'/g)].map((m) => m[1]!)),
    ];
    const targets = new Set(
      [...component.matchAll(/data-error-for="([^"]+)"/g)].map((m) => m[1]!),
    );
    expect(flagged.length).toBeGreaterThan(0);
    expect(flagged.filter((f) => !targets.has(f))).toEqual([]);
  });

  it('declares a tab button for every tab the script renders', () => {
    const rendered = [...new Set([...script.matchAll(/tab === '([a-z]+)'/g)].map((m) => m[1]!))];
    const buttons = new Set(
      [...component.matchAll(/data-tab="([^"]+)"/g)].map((m) => m[1]!),
    );
    // 'urls' is the fallback branch and never appears in a comparison.
    for (const tab of [...rendered, 'urls']) {
      expect(buttons.has(tab), `missing tab button ${tab}`).toBe(true);
    }
    expect(buttons.size).toBe(4);
  });

  it('passes the production origin into the markup', () => {
    expect(component).toContain('data-origin={SITE.url}');
    expect(script).toContain('root.dataset.origin');
  });

  it('constrains the output column so long snippets cannot widen the page', () => {
    // Regression: grid items default to min-width:auto, so the generated
    // snippet grew the <pre> to its full content width and pushed the document
    // to ~3800px on a 375px screen. Everything below then rendered in a sliver.
    expect(component).toMatch(/id="atc-form"[^>]*class="[^"]*\bmin-w-0\b/);
    expect(component).toMatch(/id="atc-output"[^>]*class="[^"]*\bmin-w-0\b/);
  });

  it('wraps the snippet instead of scrolling it sideways', () => {
    const pre = /<pre\b[\s\S]*?<code id="atc-code"/.exec(component)?.[0] ?? '';
    expect(pre).toContain('whitespace-pre-wrap');
    expect(pre).toContain('break-all');
    expect(pre).not.toContain('overflow-auto');
  });

  it('keeps guide-page code blocks from widening the page too', () => {
    const css = read('../styles/global.css');
    const block = /\.prose-page pre \{[\s\S]*?\}/.exec(css)?.[0] ?? '';
    expect(block).toContain('whitespace-pre-wrap');
    expect(block).toContain('break-all');
  });

  it('keeps the tab styles in global css, not a scoped @apply block', () => {
    // Tailwind 4 scoped styles need an @reference directive; keeping these
    // classes global avoids a build failure that is easy to reintroduce.
    expect(component).not.toContain('@apply');
    expect(read('../styles/global.css')).toContain('.atc-tab');
  });
});

describe('config wiring', () => {
  const config = read('../config.ts');

  it('has no trailing slash on the site url', () => {
    const url = /url:\s*'([^']+)'/.exec(config)?.[1] ?? '';
    expect(url).toMatch(/^https:\/\//);
    expect(url.endsWith('/')).toBe(false);
  });

  it('matches the site url in the astro config', () => {
    const fromConfig = /url:\s*'([^']+)'/.exec(config)?.[1];
    const astro = read('../../astro.config.mjs');
    const fromAstro = /const site = '([^']+)'/.exec(astro)?.[1];
    expect(fromAstro).toBe(fromConfig);
  });

  it('matches the sitemap host in robots.txt', () => {
    const fromConfig = /url:\s*'([^']+)'/.exec(config)?.[1];
    expect(read('../../public/robots.txt')).toContain(`${fromConfig}/sitemap-index.xml`);
  });
});
