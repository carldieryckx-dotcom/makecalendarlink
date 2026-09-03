/**
 * Everything brand- and domain-specific lives here.
 * Change these five values and the whole site follows.
 */
export const SITE = {
  /** Product name, shown in the header, titles and the .ics PRODID. */
  name: 'CalendarButton',

  /** Production origin, no trailing slash. Must match astro.config.mjs. */
  url: 'https://calendarbutton.io',

  /** One line used as the default meta description fallback. */
  tagline: 'Free add to calendar links for Google, Outlook, Office 365, Yahoo and Apple.',

  /** Shown in the footer and in the open source docs. */
  repo: 'https://github.com/carldieryckx-dotcom/calendarbutton',

  /** Contact address on the privacy and about pages. */
  email: 'hello@calendarbutton.io',

  /** Default timezone when the browser does not report one. */
  fallbackTimeZone: 'Europe/Brussels',
} as const;

export type Site = typeof SITE;
