import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Keep this in sync with SITE.url in src/config.ts.
const site = 'https://makecalendarlink.com';

export default defineConfig({
  site,

  // Everything is prerendered by default. The handful of dynamic routes
  // (/go, /api, /e, /stats) opt out with `export const prerender = false`.
  output: 'static',
  adapter: cloudflare({ imageService: 'passthrough' }),

  // Nothing here needs server-side sessions, and leaving them on would require
  // a KV namespace just to deploy.
  session: false,

  integrations: [
    sitemap({
      // Dashboards, generated event pages and the JSON endpoints are noindex.
      // The /api docs page itself should stay in.
      filter: (page) => {
        const path = new URL(page).pathname;
        return !/^\/(stats|e|go)\//.test(path) && !/^\/api\/(ics|links)/.test(path);
      },
      changefreq: 'weekly',
      lastmod: new Date(),
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
    build: { assetsInlineLimit: 2048 },
  },

  build: { inlineStylesheets: 'auto' },

  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },

  compressHTML: true,
});
