/**
 * Content images: map a path Keystatic stored back to the imported asset.
 *
 * Every editor-managed image (headshots, school and college logos, press
 * photos) lives under src/assets rather than public/, so astro:assets can
 * resize it to what the page actually paints and serve a modern format. Public
 * files are copied into the build verbatim, which is how a 3000px school logo
 * once shipped to fill a 28px badge.
 *
 * Keystatic stores the image as a path string ("/src/assets/team/x/headshot.webp"),
 * but astro:assets needs the imported module to do anything with it, so the
 * directory is globbed eagerly and the stored path looked up here. A path with
 * no matching file throws at build time rather than shipping a broken <img> -
 * the whole point of routing these through the pipeline is that a new upload is
 * optimized automatically, so a silent miss would defeat it.
 */
import type { ImageMetadata } from 'astro';

const CONTENT_IMAGES = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/{team,branches,affiliations,press}/**/*.{jpg,jpeg,png,webp,avif,svg}',
  { eager: true },
);

export function resolveImage(path: string): ImageMetadata;
export function resolveImage(path: string | null | undefined): ImageMetadata | null;
export function resolveImage(path: string | null | undefined): ImageMetadata | null {
  if (!path) return null;
  const mod = CONTENT_IMAGES[path];
  if (!mod) {
    const dir = path.slice(0, path.lastIndexOf('/') + 1);
    const siblings = Object.keys(CONTENT_IMAGES).filter((key) => key.slice(0, key.lastIndexOf('/') + 1) === dir);
    throw new Error(
      `Image "${path}" does not match a file in src/assets/{team,branches,affiliations,press}. ` +
        (siblings.length
          ? `Files in ${dir}: ${siblings.join(', ')}.`
          : `Content images must live there so astro:assets can optimize them.`),
    );
  }
  return mod.default;
}

/**
 * Widths generated for a headshot on a team card. Cards paint between ~170px
 * (half a phone screen) and 256px (desktop team grid), so this ladder covers
 * 1x through 3x displays without shipping the ~1000px crop to anyone.
 */
export const CARD_PHOTO_WIDTHS = [192, 256, 384, 512, 640, 768];

/** The 40px round avatar on the back of a card, at 1x-3x. */
export const AVATAR_WIDTHS = [40, 80, 120];

/**
 * `sizes` for the team page card grid: half the viewport less the page gutter
 * and the gap on phones, then the fixed sm:w-56 / lg:w-64 card widths.
 */
export const TEAM_CARD_SIZES = '(min-width: 1024px) 256px, (min-width: 640px) 224px, calc(50vw - 1.5rem)';

/**
 * `<Image>` props for a responsive image painted at `sizes`.
 *
 * The fallback `src` is capped at the widest width the srcset offers, so it is
 * never the full-size original. An SVG scales on its own, so it gets no srcset
 * at all - resizing one only emits identical copies under different names.
 */
export function responsive(image: ImageMetadata, widths: number[], sizes: string) {
  if (image.format === 'svg') return {};
  return { widths, sizes, width: Math.min(Math.max(...widths), image.width) };
}
