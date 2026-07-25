/**
 * Per-URL sitemap metadata (lastmod / changefreq / priority).
 *
 * `lastmod` is derived from the last git commit that touched the files backing
 * each URL, falling back to filesystem mtime when git history is unavailable
 * (e.g. a tarball deploy). It is deliberately NOT the build timestamp: a
 * sitemap that claims every page changed on every deploy is noise, and search
 * engines learn to discount it. An accurate lastmod is the signal Google uses
 * to decide what to recrawl.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { readdirSync } from 'node:fs';

const SITE_ORIGIN = 'https://loudounnatureconservation.org';

/** Last commit date for a path, or null if git can't answer. */
function gitLastModified(path) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', path], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function fsLastModified(path) {
  try {
    return statSync(path).mtime.toISOString();
  } catch {
    return null;
  }
}

/** Newest modification time across a set of files. */
function newestOf(paths) {
  const stamps = paths
    .filter((p) => existsSync(p))
    .map((p) => gitLastModified(p) ?? fsLastModified(p))
    .filter(Boolean)
    .map((s) => new Date(s))
    .filter((d) => !Number.isNaN(d.getTime()));
  if (!stamps.length) return null;
  return new Date(Math.max(...stamps.map((d) => d.getTime()))).toISOString();
}

function listDir(dir) {
  try {
    return readdirSync(dir).map((f) => `${dir}/${f}`);
  } catch {
    return [];
  }
}

const LAYOUT_FILES = [
  'src/layouts/Base.astro',
  'src/components/Nav.astro',
  'src/components/Footer.astro',
];

/**
 * Source files backing each route, plus crawl hints.
 * Research article entries are generated from the publications collection.
 */
const ROUTES = {
  '/': {
    files: ['src/pages/index.astro', 'src/content/singletons/home.yaml'],
    changefreq: 'weekly',
    priority: 1.0,
  },
  '/about/': {
    files: ['src/pages/about.astro', 'src/content/singletons/about.yaml'],
    changefreq: 'monthly',
    priority: 0.8,
  },
  '/research/': {
    files: ['src/pages/research/index.astro', ...listDir('src/content/publications')],
    changefreq: 'monthly',
    priority: 0.8,
  },
  '/volunteer/': {
    files: ['src/pages/volunteer.astro'],
    changefreq: 'monthly',
    priority: 0.8,
  },
  '/team/': {
    files: [
      'src/pages/team.astro',
      ...listDir('src/content/team'),
      ...listDir('src/content/branches'),
    ],
    changefreq: 'monthly',
    priority: 0.7,
  },
  '/events/': {
    files: ['src/pages/events.astro', ...listDir('src/content/events')],
    changefreq: 'weekly',
    priority: 0.7,
  },
  '/contact/': {
    files: ['src/pages/contact.astro'],
    changefreq: 'yearly',
    priority: 0.6,
  },
  '/funding/': {
    files: ['src/pages/funding.astro'],
    changefreq: 'yearly',
    priority: 0.6,
  },
  '/proof-of-corporation/': {
    files: ['src/pages/proof-of-corporation.astro'],
    changefreq: 'yearly',
    priority: 0.4,
  },
};

// Resolve every route's lastmod once, at config load, so serialize() stays cheap.
const RESOLVED = new Map();

for (const [route, meta] of Object.entries(ROUTES)) {
  RESOLVED.set(route, {
    lastmod: newestOf([...meta.files, ...LAYOUT_FILES]),
    changefreq: meta.changefreq,
    priority: meta.priority,
  });
}

// Research articles: lastmod from the publication YAML that generates them.
for (const file of listDir('src/content/publications')) {
  const slug = file.split('/').pop().replace(/\.yaml$/, '');
  RESOLVED.set(`/research/${slug}/`, {
    lastmod: newestOf([file, 'src/pages/research/[slug].astro', ...LAYOUT_FILES]),
    changefreq: 'yearly',
    priority: 0.7,
  });
}

/** `serialize` hook for @astrojs/sitemap. */
export function serializeSitemapEntry(item) {
  const path = item.url.replace(SITE_ORIGIN, '') || '/';
  const meta = RESOLVED.get(path);
  if (!meta) return item;
  return {
    ...item,
    ...(meta.lastmod ? { lastmod: meta.lastmod } : {}),
    changefreq: meta.changefreq,
    priority: meta.priority,
  };
}
