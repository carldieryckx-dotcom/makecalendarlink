/**
 * Use-case landing pages at /for/<slug>.
 *
 * These target the "I have a specific job to do" half of the search demand,
 * which converts better than the format queries and is far less contested.
 */
export interface UseCase {
  slug: string;
  title: string;
  h1: string;
  description: string;
  blurb: string;
  intro: string;
  sections: { h2: string; html: string }[];
  faq: { q: string; a: string }[];
}

const NEWSLETTER: UseCase = {
  slug: 'newsletters',
  title: 'Add to calendar links for newsletters and email campaigns',
  h1: 'Add to calendar in a newsletter',
  description:
    'How to put working add to calendar links in a Mailchimp, Brevo, Klaviyo or HubSpot campaign, and why the JavaScript widgets do not work in email.',
  blurb: 'What survives email clients, and what gets stripped out.',
  intro:
    'Email is the highest-value place for an add to calendar link and the most restrictive. Every fancy widget you find is JavaScript, and every email client strips JavaScript. What is left is plain links, which is enough if you build them properly.',
  sections: [
    {
      h2: 'Use the HTML snippet, not the widget',
      html: `<p>Gmail, Outlook and Apple Mail all remove <code>&lt;script&gt;</code> tags before rendering. A dropdown widget therefore shows up as nothing at all, or as a bare unstyled div. Use the HTML snippet instead: anchor tags with inline styles, which is the only styling email clients agree on.</p>
<p>One line, five links, no dependencies:</p>
<pre><code>&lt;div style="font-family:Arial,sans-serif;font-size:14px;"&gt;
  &lt;strong&gt;Add to calendar:&lt;/strong&gt;
  &lt;a href="https://calendar.google.com/..."&gt;Google&lt;/a&gt;
  &lt;a href="https://outlook.live.com/..."&gt;Outlook&lt;/a&gt;
  ...
&lt;/div&gt;</code></pre>`,
    },
    {
      h2: 'Where to put it',
      html: `<p>Directly under the confirmation sentence, not in the footer. The moment someone reads "you are registered" is the moment they will act, and every scroll between that sentence and the link costs you attendance.</p>
<p>In a reminder email a day before, put it at the very top. People opening that email have already forgotten whether they added it.</p>`,
    },
    {
      h2: 'Per-platform notes',
      html: `<ul>
<li><strong>Mailchimp.</strong> Paste into a Code block, not a Text block. The text editor rewrites inline styles.</li>
<li><strong>Brevo.</strong> Use the HTML widget. Turn off link tracking on these links, or Brevo wraps them in a redirect that some calendar apps refuse to follow.</li>
<li><strong>Klaviyo.</strong> Works in a Text block, but check the preview: Klaviyo sometimes appends UTM parameters that break the calendar URL. Add the links to the tracking exclusion list.</li>
<li><strong>HubSpot.</strong> Use a Rich text module in source mode.</li>
</ul>
<p>The link-wrapping issue is the one to watch across all of them. If your test event lands in the calendar with a title like "Click here to continue", the platform rewrote the URL.</p>`,
    },
    {
      h2: 'Measuring whether it worked',
      html: `<p>Your email platform will tell you the link was clicked. It cannot tell you the event was actually saved, and it cannot tell you which calendar people use, which is genuinely useful for deciding what to put first next time.</p>
<p>Switching on click counting routes the links through this tool first and gives you a per-calendar breakdown, with no cookie and no consent banner. If most of your list turns out to be on Outlook work accounts, that changes what your button order should be.</p>`,
    },
  ],
  faq: [
    {
      q: 'Will an .ics attachment work instead?',
      a: 'It works, but attachments hurt deliverability and mobile clients handle them unevenly. A link to a hosted .ics file gets you the same result without the spam-filter risk.',
    },
    {
      q: 'How many calendar options should I show?',
      a: 'Three covers almost everyone: Google, Outlook and .ics for the rest. Five is fine in a footer, less so mid-email.',
    },
    {
      q: 'Do the links work in the plain text version?',
      a: 'Yes, but they are long. Use the short shareable event page URL there instead, so the visitor picks their calendar on a page.',
    },
  ],
};

const WEBINARS: UseCase = {
  slug: 'webinars',
  title: 'Add to calendar links for webinars and online events',
  h1: 'Add to calendar for webinars',
  description:
    'How add to calendar links raise webinar show-up rates, where to place them in the registration flow, and what to put in the event description.',
  blurb: 'Where to place the link so registrants actually attend.',
  intro:
    'Webinar registration is easy and attendance is hard. The gap between the two is mostly a memory problem, and a calendar entry is the cheapest fix available: it puts your event in the one place people check before deciding what to do next.',
  sections: [
    {
      h2: 'Three places the link belongs',
      html: `<ol>
<li><strong>The confirmation page.</strong> Right after the form, while the intent is still fresh. This is the highest-converting placement by a wide margin.</li>
<li><strong>The confirmation email.</strong> For the people who registered on their phone and will attend from a laptop.</li>
<li><strong>The reminder email.</strong> Twenty-four hours before, at the top. Some registrants never added it, and this is the last useful moment.</li>
</ol>`,
    },
    {
      h2: 'Put the join link in the location field',
      html: `<p>Not in the description, in the <code>location</code> field. Calendar apps surface the location on the event card and in mobile notifications, so at start time the attendee taps a notification and is in the room. If the join URL is buried in the description, they have to open the event and hunt for it, and some of them will not bother.</p>`,
    },
    {
      h2: 'Write the description for the moment it is read',
      html: `<p>The description gets read once, thirty seconds before the event, by someone deciding whether to show up. So lead with what they get, not with logistics:</p>
<pre><code>What you will walk away with: a working pricing model for
your own product, plus the spreadsheet we build live.

Join: https://meet.example.com/abc
Cannot make it? The recording goes out to everyone
who registered.</code></pre>
<p>Mentioning the recording is counterintuitive but works. People who know they can catch up later register more readily, and a decent share still turn up live.</p>`,
    },
    {
      h2: 'Recurring series',
      html: `<p>For a weekly series, generate one recurring event rather than a link per session. Google takes a recurrence rule directly, and the <code>.ics</code> file carries an RRULE for everything else. One click, the whole series in the calendar, and you are not sending five emails.</p>`,
    },
    {
      h2: 'What to expect',
      html: `<p>Vendor case studies claim large lifts here and are worth treating with suspicion, since the tool provider is rarely a neutral party. What holds up is the mechanism: attendance depends on remembering, and a calendar entry with a working join link removes the two most common failure points. Measure it yourself with click counting on and off across two comparable events, and you will have a number you can trust.</p>`,
    },
  ],
  faq: [
    {
      q: 'Should I use my webinar platform\'s built-in calendar link?',
      a: 'If it supports the calendars your audience uses and gets timezones right, yes. Test it first: platform-generated links are a common source of the Google Calendar GMT+00:00 bug.',
    },
    {
      q: 'What timezone should I generate the link in?',
      a: 'The event\'s own timezone, the one you advertised. Every provider then converts it to each attendee\'s local time.',
    },
    {
      q: 'Can I add the event to attendees\' calendars automatically?',
      a: 'Only with calendar write access through their account, which means an OAuth flow. For a registration form, a link is the realistic option, and people prefer being asked.',
    },
  ],
};

const SIGNATURE: UseCase = {
  slug: 'email-signature',
  title: 'Add a booking or event link to your email signature',
  h1: 'Add to calendar in an email signature',
  description:
    'How to put an add to calendar link in your email signature for a recurring event, office hours or a launch date.',
  blurb: 'For office hours, launch dates and recurring sessions.',
  intro:
    'An email signature is quiet, permanent advertising that every recipient sees. For anyone running a recurring public session, it is a free channel that most people leave empty.',
  sections: [
    {
      h2: 'What works in a signature',
      html: `<p>One link, one line, no images. Signature editors in Gmail and Outlook strip most markup, and an image-based button will be blocked by default in half of the clients that receive it.</p>
<pre><code>Weekly office hours, Thursdays 15:00 CET → Add to calendar</code></pre>
<p>Point it at the shareable event page rather than a specific provider. The recipient picks their own calendar on the page, and you only have one URL to maintain.</p>`,
    },
    {
      h2: 'Use a recurring event',
      html: `<p>A signature link outlives any single date. Generate it as a recurring event with no end, and it stays correct indefinitely. A link to a fixed date is stale the day after and quietly makes you look inattentive.</p>`,
    },
    {
      h2: 'Adding it in Gmail and Outlook',
      html: `<ul>
<li><strong>Gmail.</strong> Settings, See all settings, Signature. Type the text, select it, then use the link button. Pasting raw HTML does not work here.</li>
<li><strong>Outlook on the web.</strong> Settings, Mail, Compose and reply. Same approach.</li>
<li><strong>Outlook desktop.</strong> The signature editor accepts pasted HTML, so you can paste the snippet directly.</li>
<li><strong>Apple Mail.</strong> Paste into the signature box with formatting kept, then untick "Always match my default message font".</li>
</ul>`,
    },
  ],
  faq: [
    {
      q: 'Will a calendar link in my signature trip spam filters?',
      a: 'A single plain link to a normal domain does not. Tracking redirects through an unfamiliar shortener sometimes do, which is one more reason to use your own domain.',
    },
    {
      q: 'Can I see how many people click it?',
      a: 'Yes, switch on click counting when you generate the link. You get a per-calendar count without any cookie.',
    },
  ],
};

const WORDPRESS: UseCase = {
  slug: 'wordpress',
  title: 'Add an "Add to calendar" button to WordPress without a plugin',
  h1: 'Add to calendar button in WordPress',
  description:
    'Paste an add to calendar button into WordPress with a Custom HTML block, no plugin and no database table.',
  blurb: 'A Custom HTML block, no plugin, no bloat.',
  intro:
    'Most WordPress calendar plugins install a database table, a settings page and a script bundle to do something that is a link. If you have one event, or a handful, you do not need any of that.',
  sections: [
    {
      h2: 'The Custom HTML block',
      html: `<p>In the block editor, add a <strong>Custom HTML</strong> block and paste the widget snippet:</p>
<pre><code>&lt;div data-add-to-calendar
     data-title="Q4 product webinar"
     data-start="2026-09-10T14:00"
     data-end="2026-09-10T15:00"
     data-timezone="Europe/Brussels"
     data-location="https://meet.example.com/abc"&gt;&lt;/div&gt;
&lt;script src="https://makecalendarlink.com/embed.js" async defer&gt;&lt;/script&gt;</code></pre>
<p>That is the whole integration. The widget renders inside a shadow root, so your theme's CSS cannot break it and it cannot break your theme.</p>`,
    },
    {
      h2: 'Styling it to match your theme',
      html: `<p>The widget reads a handful of CSS custom properties, so you can restyle it from your theme without touching the script:</p>
<pre><code>[data-add-to-calendar] {
  --atc-bg: #111827;
  --atc-color: #ffffff;
  --atc-border: #111827;
  --atc-radius: 999px;
  --atc-accent: #6366f1;
}</code></pre>`,
    },
    {
      h2: 'Classic editor and page builders',
      html: `<ul>
<li><strong>Classic editor.</strong> Switch to the Text tab and paste there. The Visual tab strips the data attributes.</li>
<li><strong>Elementor.</strong> Use an HTML widget.</li>
<li><strong>Divi.</strong> Use a Code module.</li>
<li><strong>Bricks.</strong> Use a Code element with execution enabled.</li>
</ul>`,
    },
    {
      h2: 'If you would rather have no JavaScript',
      html: `<p>Use the plain HTML snippet instead of the widget. Five styled links, zero script, works everywhere, and it costs you the dropdown. On a page with a single event that is often the better trade.</p>`,
    },
  ],
  faq: [
    {
      q: 'Does the script slow my site down?',
      a: 'It is a few kilobytes gzipped, loaded async, with no dependencies. It will not show up in your Core Web Vitals.',
    },
    {
      q: 'Can I self-host the script?',
      a: 'Yes. Copy embed.js into your theme directory and point the src at it. It has no runtime dependency on the hosted site unless you switch on click counting.',
    },
    {
      q: 'Will it work with a caching plugin?',
      a: 'Yes. Everything is static and the links are built in the browser, so there is nothing for a page cache to get wrong.',
    },
  ],
};

export const USE_CASES: UseCase[] = [NEWSLETTER, WEBINARS, SIGNATURE, WORDPRESS];

export const useCaseBySlug = (slug: string) => USE_CASES.find((u) => u.slug === slug);
