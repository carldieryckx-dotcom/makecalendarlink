import { env } from 'cloudflare:workers';
import type { D1Like } from './analytics';

/**
 * Access to Cloudflare bindings.
 *
 * Kept in its own module because it imports `cloudflare:workers`, which only
 * resolves inside the Workers runtime. Nothing in `lib/` that the tests or the
 * browser bundle touch is allowed to import this file.
 */

/** The click analytics database, or undefined when no D1 binding is configured. */
export function getDb(): D1Like | undefined {
  return (env as unknown as Record<string, unknown>).DB as D1Like | undefined;
}

/** `ctx.waitUntil`, so a redirect never waits on the analytics write. */
export function getWaitUntil(
  locals: unknown,
): ((promise: Promise<unknown>) => void) | undefined {
  const ctx = (locals as { cfContext?: { waitUntil?: (p: Promise<unknown>) => void } }).cfContext;
  return typeof ctx?.waitUntil === 'function' ? ctx.waitUntil.bind(ctx) : undefined;
}
