/**
 * Press coverage: one normalized source for every surface that renders it.
 *
 * The list lives in the `home` singleton's `pressLinks` array (Keystatic), and
 * is read by the homepage strip, /press/, /about/, and /llms.txt. Those four
 * had already drifted once - the homepage carried a hardcoded fallback list
 * that was missing WUSA9 and had a stale WTOP headline - so the loading,
 * ordering, and grouping rules live here rather than being restated per page.
 *
 * Ordering is editorial, not chronological: whatever the editor drags to the
 * top of the array is the featured story. Dates are optional and most of the
 * older entries have none, so sorting by date would silently reshuffle the list
 * around whichever entries happen to be dated.
 */
import type { ImageMetadata } from 'astro';
import reader from './reader';

/**
 * Press photos live in src/assets/press so astro:assets can optimize them.
 *
 * Keystatic stores the image as a path string, but astro:assets needs the
 * imported module to do anything with it, so the directory is globbed eagerly
 * and the stored path looked up here. A path with no matching file throws at
 * build time rather than shipping a broken <img> - the whole point of routing
 * these through the pipeline is that a new upload is optimized automatically,
 * so a silent miss would defeat it.
 */
const PRESS_IMAGES = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/press/*.{jpg,jpeg,png,webp,avif}',
  { eager: true },
);

function resolveImage(path: string | null | undefined): ImageMetadata | null {
  if (!path) return null;
  const mod = PRESS_IMAGES[path];
  if (!mod) {
    throw new Error(
      `Press image "${path}" is not in src/assets/press. ` +
        `Known: ${Object.keys(PRESS_IMAGES).join(', ') || '(none)'}`,
    );
  }
  return mod.default;
}

export interface PressItem {
  publication: string;
  headline: string;
  url: string;
  /** ISO date (YYYY-MM-DD), when known. Most older entries have none. */
  date: string | null;
  byline: string | null;
  summary: string | null;
  /** Verbatim pull quote from the article, stored without quote marks. */
  quote: string | null;
  quoteAttribution: string | null;
  /** Imported asset, ready for <Image>. Null when the entry has no photo. */
  image: ImageMetadata | null;
  imageAlt: string | null;
  imageCredit: string | null;
}

/** All press items with the three required fields present, in editorial order. */
export async function getPressItems(): Promise<PressItem[]> {
  const home = await reader.singletons.home.read();
  return (home?.pressLinks ?? [])
    .filter((p): p is typeof p & { publication: string; headline: string; url: string } =>
      Boolean(p.publication && p.headline && p.url),
    )
    .map((p) => ({
      publication: p.publication,
      headline: p.headline,
      url: p.url,
      date: p.date || null,
      byline: p.byline || null,
      summary: p.summary || null,
      quote: p.quote || null,
      quoteAttribution: p.quoteAttribution || null,
      image: resolveImage(p.image),
      imageAlt: p.imageAlt || null,
      imageCredit: p.imageCredit || null,
    }));
}

/**
 * Split into the featured story (first entry) and the rest.
 *
 * The homepage gives `featured` a photo and a summary and lists `rest` as bare
 * wordmarks, so the featured outlet never appears twice in the same section.
 */
/** A press item known to carry art - what the featured slot requires. */
export type FeaturedPressItem = PressItem & { image: ImageMetadata };

export function splitFeatured(items: PressItem[]): {
  featured: FeaturedPressItem | null;
  rest: PressItem[];
} {
  if (items.length === 0) return { featured: null, rest: [] };
  const [first, ...rest] = items;
  // Only feature a story that actually has art to carry the layout. Without an
  // image the featured block would render as an empty half, so fall back to
  // listing everything as wordmarks.
  if (!first.image) return { featured: null, rest: items };
  return { featured: first as FeaturedPressItem, rest };
}

export interface PressStripEntry {
  publication: string;
  slug: string;
  /** Total stories this outlet has on file. */
  count: number;
  /** Set only when `count` is 1 - link straight out rather than via /press/. */
  url: string | null;
  headline: string | null;
}

/**
 * The homepage wordmark row: exactly one entry per outlet, every outlet.
 *
 * A wordmark can only carry a publication name, so an outlet that has covered
 * LNCP twice would otherwise render as two identical links. One entry per
 * outlet makes that impossible: with a single story it links straight to the
 * article, and with more it points at that outlet's section on /press/, badged
 * with the count, where every story it ran is listed.
 *
 * The featured outlet stays in the row even though its story also appears above
 * it. This row reads as the roster of everyone who has covered LNCP, so an
 * outlet missing from it reads as an outlet that never ran anything - which is
 * exactly backwards for the most recent story on the page.
 */
export function buildPressStrip(items: PressItem[]): PressStripEntry[] {
  return groupByPublication(items).map((g) => ({
    publication: g.publication,
    slug: g.slug,
    count: g.items.length,
    url: g.items.length === 1 ? g.items[0].url : null,
    headline: g.items.length === 1 ? g.items[0].headline : null,
  }));
}

export interface PressGroup {
  publication: string;
  /** Stable anchor for deep links, e.g. /press/#loudoun-times-mirror. */
  slug: string;
  items: PressItem[];
}

/**
 * Collapse consecutive-or-not entries from the same outlet into one group,
 * preserving the order each outlet first appears.
 *
 * This is what keeps the homepage strip honest once an outlet covers LNCP more
 * than once: a wordmark row is only publication names, so two entries from the
 * same paper would render as two identical links. Grouped, the outlet appears
 * once and points at its section on /press/, where both stories are listed.
 */
export function groupByPublication(items: PressItem[]): PressGroup[] {
  const groups = new Map<string, PressGroup>();
  for (const item of items) {
    const slug = slugifyPublication(item.publication);
    const existing = groups.get(slug);
    if (existing) existing.items.push(item);
    else groups.set(slug, { publication: item.publication, slug, items: [item] });
  }
  return [...groups.values()];
}

export function slugifyPublication(publication: string): string {
  return publication
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** "August 20, 2026". UTC so a YYYY-MM-DD date never slips a day westward. */
export function formatPressDate(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
