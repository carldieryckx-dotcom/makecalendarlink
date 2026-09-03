/**
 * DOM-level tests for the embed widget.
 *
 * The widget is the part other people put on their own sites, so it gets the
 * closest scrutiny: it has to render, open, expose real links and clean up
 * after itself in a browser it does not control.
 *
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGIN = 'https://calendarbutton.io';

async function mount(attrs: Record<string, string>, html = '') {
  document.head.innerHTML = `<script src="${ORIGIN}/embed.js"></script>`;
  const attrString = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v.replace(/"/g, '&quot;')}"`)
    .join(' ');
  document.body.innerHTML = `<div data-add-to-calendar ${attrString}></div>${html}`;

  vi.resetModules();
  await import('../../widget/embed');

  const host = document.querySelector<HTMLElement>('[data-add-to-calendar]')!;
  return {
    host,
    shadow: host.shadowRoot,
    trigger: host.shadowRoot?.querySelector<HTMLButtonElement>('button.trigger') ?? null,
    menu: host.shadowRoot?.querySelector<HTMLElement>('.menu') ?? null,
    links: () => [...(host.shadowRoot?.querySelectorAll<HTMLAnchorElement>('.menu a') ?? [])],
  };
}

const BASE = {
  'data-title': 'Q4 product webinar',
  'data-start': '2026-09-10T14:00',
  'data-end': '2026-09-10T15:00',
  'data-timezone': 'Europe/Brussels',
};

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('widget rendering', () => {
  it('renders a trigger and a menu in a shadow root', async () => {
    const { shadow, trigger, links } = await mount(BASE);
    expect(shadow).not.toBeNull();
    expect(trigger?.textContent).toContain('Add to calendar');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(links()).toHaveLength(5);
  });

  it('uses a custom label', async () => {
    const { trigger } = await mount({ ...BASE, 'data-label': 'Save the date' });
    expect(trigger?.textContent).toContain('Save the date');
  });

  it('honours a provider subset, in the given order', async () => {
    const { links } = await mount({ ...BASE, 'data-providers': 'ics,google' });
    expect(links().map((a) => a.textContent)).toEqual(['Apple / iCal (.ics)', 'Google Calendar']);
  });

  it('renders nothing without a title or start', async () => {
    const { shadow } = await mount({ 'data-timezone': 'UTC' });
    expect(shadow).toBeNull();
  });

  it('does not render twice on a rescan', async () => {
    const { host } = await mount(BASE);
    (window as unknown as { addToCalendar: { scan: () => void } }).addToCalendar.scan();
    expect(host.shadowRoot?.querySelectorAll('.menu').length).toBe(1);
  });
});

describe('widget links', () => {
  it('points straight at the providers when tracking is off', async () => {
    const { links } = await mount(BASE);
    const hrefs = links().map((a) => a.getAttribute('href')!);
    expect(hrefs[0]).toContain('calendar.google.com');
    expect(hrefs[1]).toContain('outlook.live.com');
    expect(hrefs[2]).toContain('outlook.office.com');
    expect(hrefs[3]).toContain('calendar.yahoo.com');
    // .ics is generated in the browser, so there is nothing to link to.
    expect(hrefs[4]).toBe('#');
  });

  it('routes through the script origin when tracking is on', async () => {
    const { links } = await mount({ ...BASE, 'data-track': 'on' });
    for (const a of links()) {
      expect(a.getAttribute('href')).toContain(`${ORIGIN}/go/`);
    }
    expect(links()[4].getAttribute('href')).toContain('/go/ics?e=');
  });

  it('keeps the local wall time in the Google link', async () => {
    const { links } = await mount(BASE);
    const url = new URL(links()[0].href);
    expect(url.searchParams.get('dates')).toBe('20260910T140000/20260910T150000');
    expect(url.searchParams.get('ctz')).toBe('Europe/Brussels');
  });

  it('passes location and description through', async () => {
    const { links } = await mount({
      ...BASE,
      'data-location': 'https://meet.example.com/abc',
      'data-description': 'Bring questions.',
    });
    const url = new URL(links()[0].href);
    expect(url.searchParams.get('location')).toBe('https://meet.example.com/abc');
    expect(url.searchParams.get('details')).toBe('Bring questions.');
  });

  it('handles all-day events', async () => {
    const { links } = await mount({
      'data-title': 'Team offsite',
      'data-start': '2026-09-10',
      'data-end': '2026-09-12',
      'data-timezone': 'Europe/Brussels',
      'data-all-day': 'true',
    });
    expect(new URL(links()[0].href).searchParams.get('dates')).toBe('20260910/20260913');
  });

  it('opens hosted providers in a new tab', async () => {
    const { links } = await mount(BASE);
    expect(links()[0].target).toBe('_blank');
    expect(links()[0].rel).toBe('noopener');
  });
});

describe('widget interaction', () => {
  it('opens and closes on the trigger', async () => {
    const { trigger, menu } = await mount(BASE);
    expect(menu?.hasAttribute('data-open')).toBe(false);
    trigger!.click();
    expect(menu?.hasAttribute('data-open')).toBe(true);
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    trigger!.click();
    expect(menu?.hasAttribute('data-open')).toBe(false);
  });

  it('closes on Escape', async () => {
    const { trigger, menu } = await mount(BASE);
    trigger!.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(menu?.hasAttribute('data-open')).toBe(false);
  });

  it('closes on a click elsewhere on the page', async () => {
    const { trigger, menu } = await mount(BASE, '<p id="outside">hello</p>');
    trigger!.click();
    document.getElementById('outside')!.click();
    expect(menu?.hasAttribute('data-open')).toBe(false);
  });

  it('exposes a rescan hook for single page apps', async () => {
    await mount(BASE);
    const api = (window as unknown as { addToCalendar?: { scan?: unknown } }).addToCalendar;
    expect(typeof api?.scan).toBe('function');
  });
});

describe('widget resilience', () => {
  it('survives an invalid date without throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { shadow } = await mount({ ...BASE, 'data-start': 'next tuesday' });
    expect(shadow).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it('does not leak styles to the host document', async () => {
    await mount(BASE);
    expect(document.querySelectorAll('body > style')).toHaveLength(0);
    expect(document.head.querySelector('style')).toBeNull();
  });
});
