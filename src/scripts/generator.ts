import {
  browserTimeZone,
  buildEmbedHtml,
  buildTrackedLinks,
  downloadIcs,
  formatWallTime,
  prettyZone,
  supportedTimeZones,
  type CalendarEvent,
} from '../lib';
import { buildWidgetHtml } from '../lib/output';

type Tab = 'html' | 'widget' | 'urls' | 'markdown';

const root = document.getElementById('generator');
const form = document.getElementById('atc-form') as HTMLFormElement | null;
if (root && form) init(root, form);

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}

const PROVIDER_ICONS: Record<string, string> = {
  google:
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 15H5V9h14v10Z"/></svg>',
};

function init(root: HTMLElement, form: HTMLFormElement) {
  const origin =
    root.dataset.origin && /^https?:\/\//.test(root.dataset.origin)
      ? root.dataset.origin.replace(/\/+$/, '')
      : window.location.origin;

  fillTimeZones();
  primeDates();

  let current: { event: CalendarEvent; track: boolean } | null = null;
  let tab: Tab = 'html';
  /** Previous start instant, so an edit can shift the end by the same amount. */
  let lastStartMs: number | null = null;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // A queued live re-render would run clearErrors() straight after this and
    // wipe the validation state the submit is about to set.
    clearTimeout(pending);
    clearErrors();
    const parsed = readForm();
    if (!parsed) return;
    current = parsed;
    render();
    el('atc-output').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  // Once links exist, keep them in step with the form. Without this, editing a
  // field leaves correct-looking links on screen that describe the old event,
  // which is worse than showing nothing.
  let pending = 0;
  form.addEventListener('input', onEdit);
  form.addEventListener('change', onEdit);

  function onEdit(event: Event) {
    syncEndToStart(event);
    if (!current) return;
    clearTimeout(pending);
    pending = window.setTimeout(() => {
      const parsed = readForm({ quiet: true });
      if (!parsed) {
        // Still invalid mid-edit. Hide the stale links rather than lie, but
        // leave any message from an explicit submit standing.
        el('atc-result').hidden = true;
        el('atc-empty').hidden = false;
        return;
      }
      clearErrors();
      current = parsed;
      render();
    }, 250);
  }

  /**
   * Moving the start moves the end by the same amount, so the duration the
   * user set is preserved. Every calendar app behaves this way and people
   * expect it; without it, pushing a 14:00 event to 16:00 silently produces
   * an end before the start.
   */
  function syncEndToStart(event: Event) {
    const target = event.target as HTMLElement | null;
    if (!target || (target.id !== 'f-start-date' && target.id !== 'f-start-time')) return;

    const startMs = parseLocal(value('f-start-date'), value('f-start-time'));
    const endMs = parseLocal(value('f-end-date'), value('f-end-time'));
    if (startMs === null || endMs === null) return;

    const previous = lastStartMs;
    lastStartMs = startMs;
    if (previous === null) return;

    const duration = endMs - previous;
    if (duration < 0) return;

    const shifted = new Date(startMs + duration);
    setValue('f-end-date', isoDate(shifted));
    if (!el<HTMLInputElement>('f-allday').checked) setValue('f-end-time', isoTime(shifted));
  }

  function parseLocal(date: string, time: string): number | null {
    if (!date) return null;
    const [y, m, d] = date.split('-').map(Number);
    const [h, min] = (time || '00:00').split(':').map(Number);
    if (!y || !m || !d) return null;
    return Date.UTC(y, m - 1, d, h || 0, min || 0);
  }

  const isoDate = (d: Date) => d.toISOString().slice(0, 10);
  const isoTime = (d: Date) => d.toISOString().slice(11, 16);

  form.addEventListener('reset', () => {
    current = null;
    el('atc-result').hidden = true;
    el('atc-empty').hidden = false;
    clearErrors();
    setTimeout(() => {
      primeDates();
      syncAllDay();
    });
  });

  el<HTMLInputElement>('f-allday').addEventListener('change', syncAllDay);

  el('atc-example').addEventListener('click', () => {
    const inTwoWeeks = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    setValue('f-title', 'How to double your webinar show-up rate');
    setValue('f-start-date', inTwoWeeks);
    setValue('f-end-date', inTwoWeeks);
    setValue('f-start-time', '14:00');
    setValue('f-end-time', '15:00');
    setValue('f-location', 'https://meet.google.com/abc-defg-hij');
    setValue(
      'f-description',
      'A 45 minute session with live Q&A. Recording goes out to everyone who registers.',
    );
    form.requestSubmit();
  });

  for (const btn of document.querySelectorAll<HTMLButtonElement>('.atc-tab')) {
    btn.addEventListener('click', () => {
      tab = btn.dataset.tab as Tab;
      render();
    });
  }

  el('atc-copy').addEventListener('click', async () => {
    const button = el<HTMLButtonElement>('atc-copy');
    try {
      await navigator.clipboard.writeText(el('atc-code').textContent ?? '');
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Press Ctrl+C';
      window.getSelection()?.selectAllChildren(el('atc-code'));
    }
    setTimeout(() => (button.textContent = 'Copy'), 1800);
  });

  // ---------------- form reading ----------------

  /**
   * `quiet` is for the live re-render: mid-edit a field is briefly invalid and
   * flashing red at someone who is still typing is worse than doing nothing.
   */
  function readForm(opts: { quiet?: boolean } = {}): { event: CalendarEvent; track: boolean } | null {
    const fail = (field: string, message?: string) => {
      if (!opts.quiet) showError(field, message);
      return null;
    };

    // Callers clear errors themselves: the submit handler before validating,
    // the live re-render only once the form parses cleanly.
    const allDay = el<HTMLInputElement>('f-allday').checked;
    const title = value('f-title').trim();
    const startDate = value('f-start-date');
    const startTime = value('f-start-time') || '09:00';
    const endDate = value('f-end-date') || startDate;
    const endTime = value('f-end-time') || startTime;

    if (!title) return fail('title');
    if (!startDate) return fail('start');

    const start = allDay ? startDate : `${startDate}T${startTime}`;
    let end = allDay ? endDate : `${endDate}T${endTime}`;

    // A same-instant end is almost never what someone means: default to one hour.
    if (!allDay && end === start) {
      const [h, m] = startTime.split(':').map(Number);
      const bumped = new Date(Date.UTC(2000, 0, 1, h, m) + 3600_000);
      end = `${endDate}T${String(bumped.getUTCHours()).padStart(2, '0')}:${String(
        bumped.getUTCMinutes(),
      ).padStart(2, '0')}`;
    }

    if (end < start) return fail('end');

    const repeat = value('f-repeat');
    const count = value('f-count');
    const rrule = repeat ? (count ? `${repeat};COUNT=${count}` : repeat) : undefined;
    const reminder = value('f-reminder');

    const event: CalendarEvent = {
      title,
      start,
      end,
      timeZone: value('f-timezone') || browserTimeZone(),
      allDay: allDay || undefined,
      location: value('f-location').trim() || undefined,
      description: value('f-description').trim() || undefined,
      url: value('f-url').trim() || undefined,
      organizerEmail: value('f-organizer').trim() || undefined,
      reminderMinutes: reminder ? Number(reminder) : undefined,
      rrule,
    };

    return { event, track: el<HTMLInputElement>('f-track').checked };
  }

  // ---------------- rendering ----------------

  function render() {
    if (!current) return;
    const { event, track } = current;

    let built;
    try {
      built = buildTrackedLinks(event, { origin, track });
    } catch (err) {
      showError('end', err instanceof Error ? err.message : 'Something is off with these dates.');
      return;
    }

    el('atc-empty').hidden = true;
    el('atc-result').hidden = false;

    // preview buttons
    const preview = el('atc-preview');
    preview.replaceChildren();
    for (const target of built.targets) {
      const a = document.createElement('a');
      a.className =
        'inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-800 hover:border-brand-500 hover:text-brand-700';
      a.textContent = target.label;
      a.href = target.href;
      a.target = '_blank';
      a.rel = 'noopener';
      if (target.provider === 'ics' && !track) {
        // No round trip needed when tracking is off.
        a.addEventListener('click', (e) => {
          e.preventDefault();
          downloadIcs(event);
        });
      }
      if (PROVIDER_ICONS[target.provider]) {
        a.insertAdjacentHTML('afterbegin', PROVIDER_ICONS[target.provider]);
      }
      preview.append(a);
    }

    el('atc-summary').textContent = summarize(event);

    // tabs
    for (const btn of document.querySelectorAll<HTMLButtonElement>('.atc-tab')) {
      btn.setAttribute('aria-selected', String(btn.dataset.tab === tab));
    }

    const hints: Record<Tab, string> = {
      html: 'Paste this into a newsletter, a CMS block or an email signature. Plain links with inline styles, so it survives every email client.',
      widget:
        'A single button that opens a calendar picker. Needs JavaScript, so use it on a website rather than in email.',
      urls: 'The raw destination per calendar. Handy for buttons you style yourself, or for QR codes.',
      markdown: 'For README files, Notion, Slack posts and anything else that speaks Markdown.',
    };
    el('atc-tab-hint').textContent = hints[tab];

    const code =
      tab === 'html'
        ? buildEmbedHtml(event, { origin, track })
        : tab === 'widget'
          ? buildWidgetHtml(event, { origin, track })
          : tab === 'markdown'
            ? built.targets.map((t) => `[${t.label}](${t.href})`).join('\n')
            : built.targets.map((t) => `${t.label}\n${t.href}`).join('\n\n');

    el('atc-code').textContent = code;

    // stats
    const statsBox = el('atc-stats-box');
    statsBox.hidden = !track;
    if (track) {
      const url = `${origin}/stats/${built.key}`;
      const link = el<HTMLAnchorElement>('atc-stats-link');
      link.href = url;
      link.textContent = url;
    }
  }

  function summarize(event: CalendarEvent): string {
    const label = formatWallTime(event.start, {
      locale: navigator.language,
      allDay: event.allDay,
    });
    const zone = event.allDay ? '' : `, ${prettyZone(event.timeZone)}`;
    return `${label}${zone}${event.allDay ? ' (all day)' : ''}`;
  }

  // ---------------- helpers ----------------

  function fillTimeZones() {
    const select = el<HTMLSelectElement>('f-timezone');
    const mine = browserTimeZone();
    const zones = supportedTimeZones();
    if (!zones.includes(mine)) zones.unshift(mine);
    select.replaceChildren(
      ...zones.map((zone) => {
        const opt = document.createElement('option');
        opt.value = zone;
        opt.textContent = zone.replace(/_/g, ' ');
        opt.selected = zone === mine;
        return opt;
      }),
    );
  }

  function primeDates() {
    const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    if (!value('f-start-date')) setValue('f-start-date', tomorrow);
    if (!value('f-end-date')) setValue('f-end-date', tomorrow);
  }

  function syncAllDay() {
    const allDay = el<HTMLInputElement>('f-allday').checked;
    for (const id of ['f-start-time', 'f-end-time']) {
      const input = el<HTMLInputElement>(id);
      input.disabled = allDay;
      input.classList.toggle('opacity-40', allDay);
    }
    el('f-reminder').closest('div')?.classList.toggle('opacity-50', allDay);
  }

  function value(id: string): string {
    return el<HTMLInputElement>(id).value;
  }
  function setValue(id: string, v: string) {
    el<HTMLInputElement>(id).value = v;
  }
  /** Which input a given error message should send the user to. */
  const ERROR_FIELDS: Record<string, string> = {
    title: 'f-title',
    start: 'f-start-date',
    end: 'f-end-time',
  };

  function showError(field: string, message?: string) {
    const node = document.querySelector<HTMLElement>(`[data-error-for="${field}"]`);
    if (!node) return;
    if (message) node.textContent = message;
    node.hidden = false;
    node.classList.remove('hidden');

    // Links already on screen describe an event the form no longer holds.
    el('atc-result').hidden = true;
    el('atc-empty').hidden = false;

    // Move the caret to the field at fault, so keyboard and screen reader
    // users find out what went wrong without hunting for red text.
    const input = document.getElementById(ERROR_FIELDS[field] ?? '');
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', node.id || `err-${field}`);
      if (!node.id) node.id = `err-${field}`;
      (input as HTMLInputElement).focus();
      input.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }
  function clearErrors() {
    for (const node of document.querySelectorAll<HTMLElement>('[data-error-for]')) {
      node.classList.add('hidden');
    }
    for (const input of document.querySelectorAll('#atc-form [aria-invalid]')) {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
  }
}
