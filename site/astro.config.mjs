import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  site: 'https://loudounnatureconservation.org',
  output: 'static',
  integrations: [
    react(),
    sitemap(),
    // Keystatic admin UI is only needed in dev (local file editing).
    // Excluding it from production builds keeps output fully static.
    ...(isDev ? [(await import('@keystatic/astro')).default()] : []),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
