/**
 * Per-URL sitemap metadata (lastmod / changefreq / priority).
 *
 * `lastmod` is derived from the last git commit that touched the files backing
 * each URL. It is deliberately NOT the build timestamp: a sitemap that claims
 * every page changed on every deploy is noise, and search engines learn to
 * discount it. An accurate lastmod is the signal Google uses to decide what to
 * recrawl.
 *
 * When git cannot give a trustworthy answer, the URL ships with no `lastmod` at
 * all. `lastmod` is optional in the sitemap spec and Google simply falls back to
 * its own crawl signals when it is absent, whereas a confidently wrong date is
 * actively misleading. Filesystem mtime is NOT used as a fallback: on any CI
 * checkout every file's mtime is the clone time, which reproduces the
 * every-page-changed-every-deploy noise this file exists to prevent.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';

const SITE_ORIGIN = 'https://loudounnatureconservation.org';

function git(args, { timeout } = {}) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      // stderr is piped, not ignored, so a failure can explain itself.
      stdio: ['ignore', 'pipe', 'pipe'],
      // Never block a build on a credential prompt.
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      ...(timeout ? { timeout } : {}),
    }).trim();
  } catch (err) {
    // Surfaced by the caller when the failure is worth explaining.
    git.lastError = (err?.stderr || err?.message || '').toString().trim();
    return null;
  }
}

/**
 * Where to fetch missing history from, when the checkout has no remote.
 *
 * Built from the environment rather than hardcoded so a fork or a rename keeps
 * working. Only GitHub over HTTPS, and only anonymously - this repo is public,
 * so no credentials are needed. If it is ever made private this fetch simply
 * fails and the caller degrades, which is the correct outcome: a build should
 * not be carrying credentials just to date a sitemap.
 */
function originUrlFromEnv() {
  const { VERCEL_GIT_PROVIDER, VERCEL_GIT_REPO_OWNER, VERCEL_GIT_REPO_SLUG } = process.env;
  if (VERCEL_GIT_PROVIDER !== 'github') return null;
  if (!VERCEL_GIT_REPO_OWNER || !VERCEL_GIT_REPO_SLUG) return null;
  return `https://github.com/${VERCEL_GIT_REPO_OWNER}/${VERCEL_GIT_REPO_SLUG}.git`;
}

/**
 * Complete a shallow clone, if this is one.
 *
 * Vercel clones at `--depth=10`, which is not enough history to date most of
 * these pages (see SHALLOW_BOUNDARY below), *and* its build container has no
 * git remote at all - `git remote -v` is empty there, so a plain
 * `git fetch --unshallow` has nowhere to fetch from and exits 0 having done
 * nothing. Both facts were established by instrumenting a real deploy, after
 * the same fetch placed in `vercel.json`'s `buildCommand` turned out never to
 * run at all despite reaching the deployment. Fetching from an explicit URL,
 * from the one module that needs the history, is what actually works.
 *
 * Failure is not fatal. The guard below still refuses to publish dates it
 * cannot stand behind, so the worst case is a sitemap with fewer `lastmod`
 * entries, never a wrong one or a failed deploy.
 */
function completeShallowClone() {
  if (git(['rev-parse', '--is-shallow-repository']) !== 'true') return;

  // With a remote configured, fetch from it; without one, name the URL.
  const origin = git(['remote']) ? null : originUrlFromEnv();
  if (!git(['remote']) && !origin) {
    console.log('[sitemap] shallow clone with no remote to complete it from');
    return;
  }

  // Capped so a hanging fetch cannot hang a deploy. This repo is small; a
  // full history fetch is well under a second in practice.
  git.lastError = '';
  git(['fetch', '--unshallow', ...(origin ? [origin] : [])], { timeout: 60_000 });

  if (git(['rev-parse', '--is-shallow-repository']) === 'true') {
    console.log(
      `[sitemap] could not complete shallow clone, some lastmod dates will be omitted${
        git.lastError ? `: ${git.lastError.split('\n')[0]}` : ''
      }`,
    );
  }
}

completeShallowClone();

/**
 * Commits at the truncation edge of a shallow clone.
 *
 * Vercel clones at `--depth=10`, and in a shallow clone the boundary commit
 * looks like it introduced every file that already existed at that point. So
 * `git log -1 -- some/old/file` confidently returns the boundary's date rather
 * than the file's real last-change date, and that date advances every time the
 * depth window slides forward - restamping untouched pages on future deploys.
 * Any answer that lands on a boundary commit is therefore "unknown", not a date.
 *
 * `completeShallowClone()` above tries to remove the truncation before this
 * runs, so on a healthy build this guard stays dormant. It exists for when that
 * fails: the sitemap then quietly loses some `lastmod` values rather than
 * publishing wrong ones. Don't remove one without the other.
 */
const SHALLOW_BOUNDARY = readShallowBoundary();

function readShallowBoundary() {
  if (git(['rev-parse', '--is-shallow-repository']) !== 'true') return new Set();
  const gitDir = git(['rev-parse', '--git-dir']);
  try {
    // One boundary commit SHA per line; the file exists only in shallow clones.
    const shas = readFileSync(`${gitDir}/shallow`, 'utf8').split('\n').filter(Boolean);
    if (shas.length) return new Set(shas);
  } catch {
    // fall through
  }
  // Shallow, but the boundary is unreadable, so no answer can be trusted.
  // `null` makes gitLastModified decline every path rather than publish
  // boundary dates as if they were real.
  return null;
}

/** Last commit date for a path, or null if git can't answer trustworthily. */
function gitLastModified(path) {
  if (SHALLOW_BOUNDARY === null) return null;
  const out = git(['log', '-1', '--format=%H %cI', '--', path]);
  if (!out) return null;
  const [hash, date] = out.split(' ');
  if (SHALLOW_BOUNDARY.has(hash)) return null;
  return date || null;
}

/** Newest modification time across a set of files. */
function newestOf(paths) {
  const stamps = paths
    .filter((p) => existsSync(p))
    .map((p) => gitLastModified(p))
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

/**
 * Content files backing each route, plus crawl hints.
 * Research article entries are generated from the publications collection.
 *
 * Shared templates (`Base.astro`, `Nav`, `Footer`, `research/[slug].astro`) are
 * deliberately excluded even though every page renders through them. Folding
 * them in means one nav tweak restamps every URL on the same second - the same
 * every-page-changed-every-deploy noise this file exists to avoid, just keyed to
 * layout commits instead of build time. Google asks for the date the page's
 * *content* last meaningfully changed, and a chrome edit is not that.
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
    lastmod: newestOf(meta.files),
    changefreq: meta.changefreq,
    priority: meta.priority,
  });
}

// Research articles: lastmod from the publication YAML that generates them.
for (const file of listDir('src/content/publications')) {
  const slug = file.split('/').pop().replace(/\.yaml$/, '');
  RESOLVED.set(`/research/${slug}/`, {
    lastmod: newestOf([file]),
    changefreq: 'yearly',
    priority: 0.7,
  });
}

// Report coverage in the build log. A silently degraded sitemap is the whole
// failure mode this file guards against, and the first deploy of that guard
// shipped with 3 of 13 URLs missing `lastmod` because the unshallow step was
// failing unnoticed. Coverage below 100% is legitimate but always worth seeing.
{
  const total = RESOLVED.size;
  const withLastmod = [...RESOLVED.values()].filter((m) => m.lastmod).length;
  const detail = SHALLOW_BOUNDARY === null || SHALLOW_BOUNDARY.size > 0
    ? ' (history is still truncated; the rest are omitted rather than guessed)'
    : '';
  console.log(`[sitemap] lastmod resolved for ${withLastmod}/${total} URLs${detail}`);
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
