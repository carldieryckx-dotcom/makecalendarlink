/**
 * One entry per calendar provider. These render at /how-to/<slug> and carry
 * the bulk of the organic search intent: people looking for the URL format,
 * the parameter names, or a fix for a timezone that came out wrong.
 */
export interface Guide {
  slug: string;
  /** Page title, kept close to the search phrase. */
  title: string;
  h1: string;
  description: string;
  blurb: string;
  /** Primary keyword, used in the intro and the internal links. */
  keyword: string;
  intro: string;
  sections: { h2: string; html: string }[];
  faq: { q: string; a: string }[];
}

const GOOGLE: Guide = {
  slug: 'google-calendar',
  title: 'How to create an "Add to Google Calendar" link',
  h1: 'Add to Google Calendar link',
  keyword: 'add to Google Calendar link',
  description:
    'The exact URL format for an add to Google Calendar link, every parameter explained, and the timezone mistake that makes events show up as GMT+00:00.',
  blurb: 'The render?action=TEMPLATE format, every parameter, and the timezone trap.',
  intro:
    'Google Calendar accepts a prefilled event through a plain URL. No API, no key, no OAuth. Get the parameters right and one click drops your event into someone else\'s calendar with the title, time and location already filled in.',
  sections: [
    {
      h2: 'The URL format',
      html: `<p>Every add to Google Calendar link is built on one endpoint:</p>
<pre><code>https://calendar.google.com/calendar/render
  ?action=TEMPLATE
  &amp;text=Q4+product+webinar
  &amp;dates=20260910T140000/20260910T150000
  &amp;ctz=Europe/Brussels
  &amp;details=A+45+minute+session+with+live+Q%26A
  &amp;location=https%3A%2F%2Fmeet.google.com%2Fabc-defg-hij</code></pre>
<p>Only <code>action=TEMPLATE</code>, <code>text</code> and <code>dates</code> are required. Everything else is optional, and every value has to be URL encoded.</p>`,
    },
    {
      h2: 'Every parameter',
      html: `<table>
<thead><tr><th>Parameter</th><th>What it does</th></tr></thead>
<tbody>
<tr><td><code>action</code></td><td>Always <code>TEMPLATE</code>. Tells Google to open the event composer.</td></tr>
<tr><td><code>text</code></td><td>Event title.</td></tr>
<tr><td><code>dates</code></td><td>Start and end, separated by a forward slash, in <code>YYYYMMDDTHHmmSS</code> form.</td></tr>
<tr><td><code>ctz</code></td><td>IANA timezone, for example <code>Europe/Brussels</code>. Use it with local times, never with UTC times.</td></tr>
<tr><td><code>details</code></td><td>Description. Basic HTML is accepted, so a link inside it stays clickable.</td></tr>
<tr><td><code>location</code></td><td>Address or a meeting URL.</td></tr>
<tr><td><code>recur</code></td><td>A recurrence rule, prefixed with <code>RRULE:</code>, for example <code>RRULE:FREQ=WEEKLY;COUNT=8</code>.</td></tr>
<tr><td><code>add</code></td><td>Comma separated guest email addresses. Only works for accounts allowed to invite.</td></tr>
<tr><td><code>crm</code></td><td>Availability: <code>BUSY</code>, <code>AVAILABLE</code> or <code>BLOCKING</code>.</td></tr>
</tbody></table>`,
    },
    {
      h2: 'The timezone mistake almost everyone makes',
      html: `<p>This is the single most common bug in add to calendar links, and it is worth understanding because it looks fine in testing.</p>
<p>If you send UTC timestamps, so with a trailing <code>Z</code>, <em>and</em> a <code>ctz</code> parameter, Google converts the times correctly but labels the event <code>(GMT+00:00) Coordinated Universal Time</code>. The event lands at the right moment, yet anyone who opens it sees a timezone that has nothing to do with the event. People then "fix" it manually and end up at the wrong hour.</p>
<p>Two combinations are correct. Pick one:</p>
<ul>
<li><strong>Local time plus zone.</strong> <code>dates=20260910T140000/20260910T150000&amp;ctz=Europe/Brussels</code>. No <code>Z</code>. This is what you want in almost every case: the event reads as 14:00 Brussels time, and every attendee sees it converted to their own zone.</li>
<li><strong>UTC only.</strong> <code>dates=20260910T120000Z/20260910T130000Z</code> and no <code>ctz</code> at all. Correct, but the composer shows UTC while the person is deciding whether to save.</li>
</ul>
<p>The wrong combination is UTC timestamps together with <code>ctz</code>.</p>`,
    },
    {
      h2: 'All-day events',
      html: `<p>Drop the time part and use date-only values. The end date is <strong>exclusive</strong>, which trips people up constantly: an event that runs 10 to 12 September needs an end of the 13th.</p>
<pre><code>&amp;dates=20260910/20260913</code></pre>
<p>Leave <code>ctz</code> off for all-day events. A date has no timezone, and adding one can shift the event by a day for attendees on the other side of the date line.</p>`,
    },
    {
      h2: 'Recurring events',
      html: `<p>Google accepts a standard iCalendar recurrence rule through <code>recur</code>. The <code>RRULE:</code> prefix is required:</p>
<pre><code>&amp;recur=RRULE%3AFREQ%3DWEEKLY%3BBYDAY%3DTU%3BCOUNT%3D8</code></pre>
<p>That gives eight weekly instances on Tuesdays. Common building blocks: <code>FREQ=DAILY|WEEKLY|MONTHLY|YEARLY</code>, <code>INTERVAL=2</code> for every other one, <code>COUNT=n</code> for a fixed number, and <code>UNTIL=20261231T000000Z</code> for an end date.</p>`,
    },
    {
      h2: 'Making the link on mobile behave',
      html: `<p>On Android, <code>calendar.google.com</code> links open in the Google Calendar app automatically. On iOS they open in the browser, and the visitor needs to be signed into their Google account for the event to save. That is out of your control, which is exactly why you should always offer an <code>.ics</code> download alongside the Google link. Apple Calendar users on iOS get a native "Add" sheet from the file, and nobody has to sign into anything.</p>`,
    },
  ],
  faq: [
    {
      q: 'Do I need a Google Calendar API key?',
      a: 'No. This is a plain URL, not an API call. Nothing needs to be registered and there is no quota.',
    },
    {
      q: 'Can I prefill guests?',
      a: 'Use <code>add=someone@example.com</code>, comma separated for several. Google only honours it when the signed-in account is allowed to invite others, so treat it as a nice-to-have rather than something to rely on.',
    },
    {
      q: 'Why is my description showing raw HTML tags?',
      a: 'The value was double encoded somewhere. Encode each parameter value exactly once, and remember that <code>&amp;</code> inside a description or URL has to become <code>%26</code>.',
    },
    {
      q: 'Is there a length limit?',
      a: 'No documented one, but browsers and email clients start truncating around 2000 characters. Keep the description short and put the detail behind a link.',
    },
  ],
};

const OUTLOOK: Guide = {
  slug: 'outlook',
  title: 'How to create an "Add to Outlook" calendar link',
  h1: 'Add to Outlook calendar link',
  keyword: 'add to Outlook calendar link',
  description:
    'The Outlook.com deeplink format for add to calendar links, the difference with Outlook 365 work accounts, and how to handle desktop Outlook.',
  blurb: 'Deeplink format for Outlook.com, plus what desktop Outlook actually needs.',
  intro:
    'Outlook is really three different products wearing the same name, and each one wants something slightly different. Outlook.com for personal accounts, Outlook on the web for work and school accounts, and the desktop app. Here is what works where.',
  sections: [
    {
      h2: 'Outlook.com, for personal accounts',
      html: `<pre><code>https://outlook.live.com/calendar/0/deeplink/compose
  ?path=/calendar/action/compose
  &amp;rru=addevent
  &amp;subject=Q4+product+webinar
  &amp;startdt=2026-09-10T12:00:00Z
  &amp;enddt=2026-09-10T13:00:00Z
  &amp;body=A+45+minute+session
  &amp;location=https%3A%2F%2Fmeet.example.com%2Fabc</code></pre>
<p>Note the parameter names: <code>subject</code> rather than title, <code>body</code> rather than description. They come from the mail composer the calendar shares its plumbing with.</p>`,
    },
    {
      h2: 'Outlook 365, for work and school accounts',
      html: `<p>Identical parameters, different host:</p>
<pre><code>https://outlook.office.com/calendar/0/deeplink/compose?...</code></pre>
<p>The two are not interchangeable. A personal account clicking an <code>outlook.office.com</code> link gets an error page, and a work account clicking an <code>outlook.live.com</code> link gets asked to create a personal Microsoft account. There is no reliable way to detect which one a visitor has, so offer both. Label them plainly, something like "Outlook.com" and "Outlook (work)".</p>`,
    },
    {
      h2: 'Which time format to send',
      html: `<p>Outlook accepts an ISO 8601 timestamp in <code>startdt</code> and <code>enddt</code>. UTC with a trailing <code>Z</code> is the most reliable choice, because Outlook renders the event in the viewer's own timezone and does not need to be told which zone you meant.</p>
<p>An explicit offset such as <code>2026-09-10T14:00:00+02:00</code> also works, though it has been flakier across Microsoft's routing changes over the years. If you only support one format, support UTC.</p>
<p>For an all-day event, send plain dates and add <code>allday=true</code>. The end date is exclusive here too.</p>
<pre><code>&amp;startdt=2026-09-10&amp;enddt=2026-09-13&amp;allday=true</code></pre>`,
    },
    {
      h2: 'Desktop Outlook',
      html: `<p>There is no URL scheme that reliably prefills the installed Outlook app. What works is an <code>.ics</code> file: Windows associates <code>text/calendar</code> with Outlook by default, so the file opens straight into the event window with everything filled in.</p>
<p>So for desktop users, the answer is not a deeplink at all. Serve the file with the right headers and let the operating system route it:</p>
<pre><code>Content-Type: text/calendar; charset=utf-8
Content-Disposition: attachment; filename="webinar.ics"</code></pre>`,
    },
    {
      h2: 'Why Microsoft links break more often than the others',
      html: `<p>Microsoft has changed the deeplink route several times: <code>/calendar/action/compose</code>, <code>/calendar/0/deeplink/compose</code>, and <code>/calendar/0/action/compose</code> have all been the recommended form at some point. Sending both <code>path=/calendar/action/compose</code> and <code>rru=addevent</code> alongside the <code>deeplink/compose</code> route covers the widest range, which is what this tool does.</p>
<p>If you hard-code Outlook links yourself, test them once a quarter. It is the one provider where a format that worked last year may quietly stop working.</p>`,
    },
  ],
  faq: [
    {
      q: 'Why does my Outlook link open a blank calendar?',
      a: 'Usually a mismatch between account type and host, or a stale deeplink route. Try the same parameters against the other host, and make sure <code>rru=addevent</code> is present.',
    },
    {
      q: 'Can one link cover both personal and work Outlook?',
      a: 'No. Offer both, or offer an .ics file, which works for every Outlook variant including the desktop app.',
    },
    {
      q: 'Does Outlook support recurring events through a URL?',
      a: 'Not reliably. Use an .ics file with an RRULE for recurring events on Outlook.',
    },
  ],
};

const APPLE: Guide = {
  slug: 'apple-calendar',
  title: 'How to create an "Add to Apple Calendar" link',
  h1: 'Add to Apple Calendar link',
  keyword: 'add to Apple Calendar link',
  description:
    'Apple Calendar has no URL format for adding events. Here is how the .ics file approach works, and the headers that make it open natively on iPhone and Mac.',
  blurb: 'No URL format exists. Here is the .ics approach that works on iOS and Mac.',
  intro:
    'Apple never shipped a web URL for adding an event to Apple Calendar, the way Google and Microsoft did. The only route is an iCalendar file. Done properly it is actually the smoothest of the lot: iOS shows a native add-event sheet and no sign-in is involved.',
  sections: [
    {
      h2: 'What the file looks like',
      html: `<pre><code>BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CalendarButton//EN
BEGIN:VEVENT
UID:9f2c1a@calendarbutton
DTSTAMP:20260601T090000Z
SUMMARY:Q4 product webinar
DTSTART;TZID=Europe/Brussels:20260910T140000
DTEND;TZID=Europe/Brussels:20260910T150000
DESCRIPTION:A 45 minute session with live Q&amp;A
LOCATION:https://meet.example.com/abc
END:VEVENT
END:VCALENDAR</code></pre>
<p>Three details matter more than they look. Lines end with CRLF, not LF. Lines longer than 75 octets must be folded onto a continuation line starting with a space. And commas, semicolons and backslashes inside text values have to be escaped with a backslash.</p>`,
    },
    {
      h2: 'Local time or UTC',
      html: `<p>Use <code>DTSTART;TZID=Europe/Brussels:20260910T140000</code> rather than converting to UTC. With a TZID the event stays anchored to 14:00 in Brussels, which is what you actually promised people. Convert to UTC instead and the event is still correct today, but if the timezone rules change before the event happens, it moves.</p>
<p>For an all-day event use a date value, with the exclusive end again:</p>
<pre><code>DTSTART;VALUE=DATE:20260910
DTEND;VALUE=DATE:20260913</code></pre>`,
    },
    {
      h2: 'Serving the file so iOS opens it natively',
      html: `<p>The headers decide whether iOS shows an add-event sheet or dumps text on the screen:</p>
<pre><code>Content-Type: text/calendar; charset=utf-8
Content-Disposition: attachment; filename="webinar.ics"</code></pre>
<p>Two things to avoid. A <code>data:</code> URI, because iOS Mail and several Android clients refuse to open them, which is why this tool serves the file from a URL instead. And <code>Content-Type: text/plain</code>, which turns the file into a wall of text in the browser.</p>`,
    },
    {
      h2: 'Reminders',
      html: `<p>Apple Calendar honours a VALARM block, so you can ship the event with a reminder already set:</p>
<pre><code>BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:Q4 product webinar
END:VALARM</code></pre>
<p>Keep it modest. A reminder the attendee did not ask for is the fastest way to have your event deleted.</p>`,
    },
    {
      h2: 'One file, many calendars',
      html: `<p>The same <code>.ics</code> covers Apple Calendar, Outlook desktop, Thunderbird, Proton Calendar, Fastmail and anything else that speaks iCalendar. That makes it the best single fallback if you only have room for one button: label it "Apple Calendar / .ics" and you have covered most of what is not Google.</p>`,
    },
  ],
  faq: [
    {
      q: 'Is there really no Apple Calendar URL?',
      a: 'No. There are <code>webcal://</code> URLs, but those subscribe to a whole calendar feed rather than adding a single event. For one event, the .ics file is the only route.',
    },
    {
      q: 'Can I use a webcal:// link for a single event?',
      a: 'You can, and it works, but the visitor ends up subscribed to a feed rather than owning a copy of the event. That means they cannot edit it, and it disappears if your feed goes away. Use it for a season of events, not for one.',
    },
    {
      q: 'Why does my .ics file open as plain text?',
      a: 'The server is sending the wrong Content-Type. It must be <code>text/calendar</code>.',
    },
  ],
};

const YAHOO: Guide = {
  slug: 'yahoo-calendar',
  title: 'How to create an "Add to Yahoo Calendar" link',
  h1: 'Add to Yahoo Calendar link',
  keyword: 'add to Yahoo Calendar link',
  description:
    'The Yahoo Calendar URL format for add to calendar links, with the parameter names and the UTC requirement.',
  blurb: 'The short parameter names, and why Yahoo wants UTC.',
  intro:
    'Yahoo Calendar still has a real user base, particularly in the United States and among older email accounts, and it costs you one more link to support. The format is the oldest of the bunch, which shows in the parameter names.',
  sections: [
    {
      h2: 'The URL format',
      html: `<pre><code>https://calendar.yahoo.com/
  ?v=60
  &amp;title=Q4+product+webinar
  &amp;st=20260910T120000Z
  &amp;et=20260910T130000Z
  &amp;desc=A+45+minute+session
  &amp;in_loc=https%3A%2F%2Fmeet.example.com%2Fabc</code></pre>
<p><code>v=60</code> is a version marker that has to be there. <code>st</code> and <code>et</code> are start and end, <code>desc</code> is the description and <code>in_loc</code> is the location.</p>`,
    },
    {
      h2: 'Yahoo wants UTC',
      html: `<p>There is no timezone parameter. Convert your local time to UTC and add the trailing <code>Z</code>. Yahoo then renders it in the account's own timezone. Send a local time without a <code>Z</code> and Yahoo interprets it as UTC anyway, which quietly shifts the event by your offset.</p>
<p>For all-day events, send plain dates and add <code>dur=allday</code>:</p>
<pre><code>&amp;st=20260910&amp;et=20260913&amp;dur=allday</code></pre>`,
    },
    {
      h2: 'Duration instead of an end time',
      html: `<p>Yahoo also accepts <code>dur=HHmm</code> as an alternative to <code>et</code>, so <code>dur=0130</code> means one and a half hours. Sending <code>et</code> is clearer and easier to keep consistent with the other providers, so prefer that unless you have a reason not to.</p>`,
    },
  ],
  faq: [
    {
      q: 'Is Yahoo Calendar worth supporting?',
      a: 'It is one extra link in a list you are already generating, and for consumer audiences in the US it still shows up in click data. Cheap to add, so add it.',
    },
    {
      q: 'Does Yahoo support recurring events by URL?',
      a: 'Not dependably. Use an .ics file for anything recurring.',
    },
  ],
};

const ICS: Guide = {
  slug: 'ics-file',
  title: 'How to create an .ics file for a calendar event',
  h1: 'Creating an .ics calendar file',
  keyword: 'create ics file',
  description:
    'A working iCalendar file explained line by line: required fields, line folding, escaping, timezones and the headers to serve it with.',
  blurb: 'iCalendar explained line by line, including folding and escaping.',
  intro:
    'The <code>.ics</code> file is the universal fallback. Every calendar application on every platform reads it, which makes it the one format worth getting exactly right. RFC 5545 is 168 pages long; here is the part you actually need.',
  sections: [
    {
      h2: 'The minimum viable file',
      html: `<pre><code>BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Your product//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:unique-per-event@yourdomain.com
DTSTAMP:20260601T090000Z
SUMMARY:Q4 product webinar
DTSTART;TZID=Europe/Brussels:20260910T140000
DTEND;TZID=Europe/Brussels:20260910T150000
END:VEVENT
END:VCALENDAR</code></pre>
<p><code>UID</code> and <code>DTSTAMP</code> are required by the spec and skipped by most hand-rolled generators. Leaving them out mostly works, until a client decides to be strict about it.</p>`,
    },
    {
      h2: 'The three rules that break files',
      html: `<ol>
<li><strong>CRLF line endings.</strong> Every line ends with <code>\\r\\n</code>. A file with plain <code>\\n</code> is technically invalid, and some Outlook versions reject it outright.</li>
<li><strong>Fold at 75 octets.</strong> Longer lines continue on the next line, which must start with a single space. Note octets, not characters: an emoji costs four.</li>
<li><strong>Escape text values.</strong> Backslash, semicolon and comma each get a leading backslash, and a newline becomes the two characters <code>\\n</code>. Miss this and a description containing a comma silently truncates the rest of the field.</li>
</ol>`,
    },
    {
      h2: 'A stable UID matters',
      html: `<p>The <code>UID</code> identifies the event. If you generate a fresh random one every time the file is downloaded, someone who clicks twice gets two events. Derive it from the event details instead, so the same event always yields the same UID and a second download updates the existing entry rather than duplicating it.</p>`,
    },
    {
      h2: 'Serving the file',
      html: `<pre><code>Content-Type: text/calendar; charset=utf-8
Content-Disposition: attachment; filename="webinar.ics"
Cache-Control: public, max-age=31536000, immutable</code></pre>
<p>The long cache is safe when the URL fully determines the contents, for example when the event is encoded in the query string. If your URL is a short ID pointing at a mutable record, do not cache it that hard.</p>`,
    },
    {
      h2: 'Validating',
      html: `<p>Before you ship, open the file in Apple Calendar, Outlook desktop and Google Calendar's import. Those three disagree about enough edge cases that passing all of them means you are fine. Watch specifically for the event landing an hour off, which almost always means a TZID the client does not recognise.</p>`,
    },
  ],
  faq: [
    {
      q: 'Do I need a VTIMEZONE block?',
      a: 'Strictly, a TZID should be accompanied by a VTIMEZONE definition. In practice every modern client resolves IANA zone names on its own. Adding an <code>X-WR-TIMEZONE</code> line covers the few that do not, without carrying a full VTIMEZONE block per event.',
    },
    {
      q: 'Can one file hold several events?',
      a: 'Yes. Repeat the VEVENT block inside the same VCALENDAR. Handy for a series of sessions people add in one go.',
    },
    {
      q: 'How do I cancel an event I already sent out?',
      a: 'Send a second file with the same UID, <code>METHOD:CANCEL</code>, <code>STATUS:CANCELLED</code> and a higher <code>SEQUENCE</code> number.',
    },
  ],
};

const OFFICE365: Guide = {
  slug: 'office-365',
  title: 'How to create an "Add to Office 365" calendar link',
  h1: 'Add to Office 365 calendar link',
  keyword: 'add to Office 365 calendar link',
  description:
    'The outlook.office.com deeplink format for Microsoft 365 work and school accounts, and why it is separate from Outlook.com.',
  blurb: 'The work and school account variant, and how to offer both safely.',
  intro:
    'Microsoft 365 work and school accounts live on a different host than personal Outlook.com accounts. Same parameters, different domain, and a link built for one fails for the other. For a B2B audience this is the variant that matters most.',
  sections: [
    {
      h2: 'The URL format',
      html: `<pre><code>https://outlook.office.com/calendar/0/deeplink/compose
  ?path=/calendar/action/compose
  &amp;rru=addevent
  &amp;subject=Q4+product+webinar
  &amp;startdt=2026-09-10T12:00:00Z
  &amp;enddt=2026-09-10T13:00:00Z
  &amp;body=A+45+minute+session
  &amp;location=Meeting+room+2</code></pre>`,
    },
    {
      h2: 'Why you cannot detect the account type',
      html: `<p>Nothing in the browser tells you whether a visitor has a personal or a work Microsoft account. Some tools guess from the email domain, which breaks the moment someone at a company uses a personal account, or the reverse.</p>
<p>The honest answer is to show both and label them clearly. In a B2B newsletter, put the work variant first: that is what most of your readers have.</p>`,
    },
    {
      h2: 'Tenants that block deeplinks',
      html: `<p>Some enterprise tenants restrict which external URLs open in Outlook on the web, and the deeplink lands on a policy page. You cannot work around that from the outside, so always keep an <code>.ics</code> download in the list. It goes through the desktop client, which those policies rarely touch.</p>`,
    },
  ],
  faq: [
    {
      q: 'Is Office 365 the same as Outlook.com?',
      a: 'No. Outlook.com is the consumer service on <code>outlook.live.com</code>. Microsoft 365 work and school accounts are on <code>outlook.office.com</code>. Offer both links.',
    },
    {
      q: 'Will this work with Microsoft Teams meetings?',
      a: 'The event is created in the attendee\'s own calendar and any Teams link in the location or body stays clickable, but it does not become a real Teams meeting. For that you need the Graph API.',
    },
  ],
};

export const GUIDES: Guide[] = [GOOGLE, OUTLOOK, OFFICE365, APPLE, ICS, YAHOO];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
