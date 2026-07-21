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
    // Keystatic (the local content editor at /keystatic) runs in dev only.
    // Production builds are fully static - no server routes, no adapter.
    ...(isDev ? [(await import('@keystatic/astro')).default()] : []),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
