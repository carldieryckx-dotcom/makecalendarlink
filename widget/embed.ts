/**
 * Standalone "Add to calendar" widget.
 *
 * Built to public/embed.js as a minified IIFE. It has no dependencies, renders
 * inside a shadow root so host CSS cannot break it, and works without cookies.
 *
 * Usage on any site:
 *
 *   <div data-add-to-calendar
 *        data-title="Product webinar"
 *        data-start="2026-09-10T14:00"
 *        data-end="2026-09-10T15:00"
 *        data-timezone="Europe/Brussels"
 *        data-location="https://meet.example.com/abc"></div>
 *   <script src="https://example.com/embed.js" async defer></script>
 */
import { buildLinks } from '../src/lib/links';
import { buildIcs, icsFilename } from '../src/lib/ics';
import { encodeEvent, eventKey } from '../src/lib/encode';
import { PROVIDER_LABELS, PROVIDERS, type CalendarEvent, type Provider } from '../src/lib/event';

const SELECTOR = '[data-add-to-calendar]';
const RENDERED = 'atcRendered';

/** Where this script itself was loaded from, so tracked links point home. */
function scriptOrigin(): string {
  const self =
    (document.currentScript as HTMLScriptElement | null) ??
    document.querySelector<HTMLScriptElement>('script[src*="embed.js"]');
  try {
    return new URL(self?.src ?? window.location.href).origin;
  } catch {
    return window.location.origin;
  }
}

const ORIGIN = scriptOrigin();

function readEvent(host: HTMLElement): CalendarEvent | null {
  const d = host.dataset;
  if (!d.title || !d.start) return null;
  return {
    title: d.title,
    start: d.start,
    end: d.end || d.start,
    timeZone: d.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    allDay: d.allDay === 'true' || d.allday === 'true' || undefined,
    location: d.location || undefined,
    description: d.description || undefined,
    url: d.url || undefined,
    rrule: d.rrule || undefined,
    reminderMinutes: d.reminder ? Number(d.reminder) : undefined,
  };
}

const CSS = `
:host { all: initial; font-family: inherit; }
* { box-sizing: border-box; }
.wrap { position: relative; display: inline-block; font: inherit;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
button.trigger {
  display: inline-flex; align-items: center; gap: .5rem; cursor: pointer;
  border: 1px solid var(--atc-border, #d4d4d8); border-radius: var(--atc-radius, 8px);
  background: var(--atc-bg, #ffffff); color: var(--atc-color, #18181b);
  font-size: var(--atc-font-size, 14px); font-weight: 600; line-height: 1.2;
  padding: var(--atc-padding, 10px 14px);
}
button.trigger:hover { background: var(--atc-bg-hover, #f4f4f5); }
button.trigger:focus-visible { outline: 2px solid var(--atc-accent, #4f46e5); outline-offset: 2px; }
svg { flex: none; }
.caret { transition: transform .15s ease; }
[aria-expanded="true"] .caret { transform: rotate(180deg); }
.menu {
  position: absolute; z-index: 2147483000; min-width: 220px; margin-top: 6px;
  background: #fff; border: 1px solid #e4e4e7; border-radius: 10px; padding: 6px;
  box-shadow: 0 10px 30px rgba(0,0,0,.12); display: none;
}
.menu[data-open] { display: block; }
.menu.up { bottom: 100%; margin-bottom: 6px; margin-top: 0; }
.menu a {
  display: block; padding: 8px 10px; border-radius: 6px; text-decoration: none;
  color: #18181b; font-size: 14px; line-height: 1.3;
}
.menu a:hover, .menu a:focus { background: #f4f4f5; outline: none; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (prefers-color-scheme: dark) {
  button.trigger { background: var(--atc-bg, #27272a); color: var(--atc-color, #fafafa);
    border-color: var(--atc-border, #3f3f46); }
  button.trigger:hover { background: var(--atc-bg-hover, #3f3f46); }
  .menu { background: #27272a; border-color: #3f3f46; }
  .menu a { color: #fafafa; }
  .menu a:hover, .menu a:focus { background: #3f3f46; }
}
`;

const CALENDAR_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>';
const CARET_ICON =
  '<svg class="caret" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>';

function render(host: HTMLElement) {
  if (host.dataset[RENDERED]) return;
  const event = readEvent(host);
  if (!event) return;
  host.dataset[RENDERED] = '1';

  const track = host.dataset.track === 'on' || host.dataset.track === 'true';
  const only = (host.dataset.providers || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is Provider => (PROVIDERS as readonly string[]).includes(s));
  const providers = only.length ? only : [...PROVIDERS];

  let hosted: ReturnType<typeof buildLinks>;
  try {
    hosted = buildLinks(event);
  } catch (err) {
    console.warn('[add-to-calendar]', err);
    return;
  }

  const encoded = encodeEvent(event);
  const key = eventKey(event);

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = CSS;

  const wrap = document.createElement('div');
  wrap.className = 'wrap';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'trigger';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.innerHTML = `${CALENDAR_ICON}<span></span>${CARET_ICON}`;
  trigger.querySelector('span')!.textContent = host.dataset.label || 'Add to calendar';

  const menu = document.createElement('div');
  menu.className = 'menu';
  menu.setAttribute('role', 'menu');

  for (const provider of providers) {
    const a = document.createElement('a');
    a.setAttribute('role', 'menuitem');
    a.textContent = PROVIDER_LABELS[provider];
    a.rel = 'noopener';

    if (provider === 'ics') {
      a.href = track ? `${ORIGIN}/go/ics?e=${encoded}&k=${key}` : '#';
      if (!track) {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const blob = new Blob([buildIcs(event)], { type: 'text/calendar;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = icsFilename(event.title);
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          close();
        });
      }
    } else {
      a.href = track
        ? `${ORIGIN}/go/${provider}?e=${encoded}&k=${key}`
        : hosted[provider as Exclude<Provider, 'ics'>];
      a.target = '_blank';
    }
    menu.append(a);
  }

  function open() {
    menu.setAttribute('data-open', '');
    trigger.setAttribute('aria-expanded', 'true');
    // Flip upward when there is no room below.
    const rect = host.getBoundingClientRect();
    menu.classList.toggle('up', window.innerHeight - rect.bottom < 260);
    menu.querySelector<HTMLAnchorElement>('a')?.focus();
    document.addEventListener('click', onOutside, true);
    document.addEventListener('keydown', onKey, true);
  }

  function close() {
    menu.removeAttribute('data-open');
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onOutside, true);
    document.removeEventListener('keydown', onKey, true);
  }

  function onOutside(e: Event) {
    if (!e.composedPath().includes(host)) close();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      close();
      trigger.focus();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...menu.querySelectorAll<HTMLAnchorElement>('a')];
    const index = items.indexOf(shadow.activeElement as HTMLAnchorElement);
    if (index === -1) return;
    e.preventDefault();
    const next = e.key === 'ArrowDown' ? index + 1 : index - 1;
    items[(next + items.length) % items.length].focus();
  }

  trigger.addEventListener('click', () => {
    menu.hasAttribute('data-open') ? close() : open();
  });

  wrap.append(trigger, menu);
  shadow.append(style, wrap);
}

function scan() {
  if (typeof document === 'undefined') return;
  for (const host of document.querySelectorAll<HTMLElement>(SELECTOR)) render(host);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scan);
} else {
  scan();
}

// Pick up widgets added later by a CMS, a modal or a framework render.
// Coalesced into one pass per task, so a chatty framework cannot make the
// page slow by triggering a query per mutation.
if (typeof MutationObserver !== 'undefined') {
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    Promise.resolve().then(() => {
      queued = false;
      scan();
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

// Small public hook for single page apps.
(window as unknown as Record<string, unknown>).addToCalendar = { scan, render };
