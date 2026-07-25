import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { serializeSitemapEntry } from './sitemap-meta.mjs';

const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  site: 'https://loudounnatureconservation.org',
  output: 'static',
  integrations: [
    react(),
    sitemap({
      // Accurate lastmod (from git history) tells Google what actually changed,
      // which is what drives recrawl priority. See sitemap-meta.mjs.
      serialize: serializeSitemapEntry,
      // 404 is excluded automatically; keep utility routes out of the index too.
      filter: (page) => !page.includes('/keystatic'),
    }),
    // Keystatic (the local content editor at /keystatic) runs in dev only.
    // Production builds are fully static - no server routes, no adapter.
    ...(isDev ? [(await import('@keystatic/astro')).default()] : []),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
