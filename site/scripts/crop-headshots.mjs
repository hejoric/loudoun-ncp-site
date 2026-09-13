/**
 * Crops every team headshot to one house framing and writes it to
 * public/assets/team/<slug>/headshot.webp.
 *
 * Run with `npm run headshots` after adding or replacing a photo in
 * assets-src/team/ (and after re-running scripts/measure-faces.swift).
 *
 * The cards used to point straight at whatever photo each person sent, which is
 * how the roster drifted: the source photos range from a tight selfie to a
 * full-body shot taken across a plaza, so the same card markup rendered faces
 * that differed eightfold in size - 8.6% of the card's height for the most
 * distant, 69% for the closest - with eye lines anywhere between 23% and 59%
 * down the card. Per-person `headshotPosition` / `headshotScale` tweaks in the
 * YAML could not fix it: those are applied after `object-fit: cover`, which
 * re-crops to the card's aspect ratio, and that ratio changes with the
 * breakpoint. A value tuned on desktop drifts on mobile.
 *
 * So the framing is baked into the file instead. Every headshot is cropped to
 * the SAME aspect ratio with the face at the SAME size and height, which means
 * `cover` treats them all identically at every breakpoint and the cards stay
 * aligned with each other no matter how the grid reflows.
 *
 * Originals stay in assets-src/team/ rather than public/: they are the input to
 * this script, and public/ is copied verbatim into the build, so keeping them
 * there would ship ~7MB of photos nobody downloads.
 */
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCES = path.join(ROOT, 'assets-src/team');
const OUTPUT = path.join(ROOT, 'public/assets/team');
const MANIFEST = path.join(ROOT, 'scripts/headshot-faces.json');

/** The card's photo well is 254x242 CSS px from 1024px up (FlipCard.astro: a
 *  fixed h-80 card, less the 4.75rem name band). Cropping to exactly that shape
 *  means desktop shows the composed frame with nothing trimmed, and every
 *  narrower breakpoint trims the sides instead of the top - so the eye line
 *  never moves. */
const ASPECT = 254 / 242;

/** Face-box height as a fraction of the crop. Vision's box runs mid-forehead to
 *  chin, so 0.38 leaves the whole head plus shoulders in frame - head and
 *  shoulders rather than a face close-up. */
const FACE_HEIGHT = 0.38;

/** Eye line, measured down from the top of the crop. Slightly above centre: it
 *  is where portraits normally put the eyes, and it leaves room for the chest
 *  below rather than stopping at the chin. */
const EYE_LINE = 0.38;

/** Never crop below this many source pixels wide. The card is 254 CSS px, so a
 *  2x display needs 508; below that a crop is sharp on paper and soft on screen.
 *  Where honouring this means a looser frame than FACE_HEIGHT asks for, the
 *  looser frame wins - a correctly sized blurry face is worse than a small
 *  sharp one. */
const MIN_SOURCE_WIDTH = 560;

/** Cap on the written file. 4x the card, which covers every breakpoint and
 *  every display without shipping a photo larger than anything can show. */
const MAX_OUTPUT_WIDTH = 1016;

const faces = JSON.parse(await readFile(MANIFEST, 'utf8'));
const report = [];

for (const [slug, face] of Object.entries(faces)) {
  const source = path.join(SOURCES, face.file);
  const { width, height } = await sharp(source).metadata();

  // Start from the crop that puts the face at exactly FACE_HEIGHT, then let the
  // source push back: a photo taken from close up simply does not contain the
  // shoulders needed for a looser frame, and there is nothing to invent.
  let cropHeight = (face.faceHeight * height) / FACE_HEIGHT;
  let cropWidth = cropHeight * ASPECT;

  if (cropWidth < MIN_SOURCE_WIDTH) {
    cropWidth = Math.min(MIN_SOURCE_WIDTH, width);
    cropHeight = cropWidth / ASPECT;
  }
  if (cropWidth > width) {
    cropWidth = width;
    cropHeight = width / ASPECT;
  }
  if (cropHeight > height) {
    cropHeight = height;
    cropWidth = Math.min(height * ASPECT, width);
    cropHeight = cropWidth / ASPECT;
  }

  // Centre on the face horizontally and hang the crop from the eye line, then
  // pull it back inside the photo. Clamping moves the eye line rather than
  // letting the crop run off the edge - which is why a photo whose subject is
  // already near the top comes out with the eyes higher than EYE_LINE.
  const left = clamp(face.faceCenterX * width - cropWidth / 2, 0, width - cropWidth);
  const top = clamp(face.eyeLine * height - EYE_LINE * cropHeight, 0, height - cropHeight);

  const rect = {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
  };
  const outputWidth = Math.min(MAX_OUTPUT_WIDTH, rect.width);

  await mkdir(path.join(OUTPUT, slug), { recursive: true });
  const destination = path.join(OUTPUT, slug, 'headshot.webp');
  const { size } = await sharp(source)
    .extract(rect)
    .resize({ width: outputWidth, height: Math.round(outputWidth / ASPECT), fit: 'fill' })
    .webp({ quality: 82 })
    .toFile(destination);

  report.push({
    slug,
    face: (face.faceHeight * height) / rect.height,
    eye: (face.eyeLine * height - rect.top) / rect.height,
    width: outputWidth,
    size,
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Print what each photo actually achieved, not what was asked for. A row that
// misses the target is a photo that needs reshooting, and the only way anyone
// finds out is if the script says so.
const pct = (n) => `${(n * 100).toFixed(1)}%`;
console.log('slug                      face     eyes     px      size   note');
for (const row of report.sort((a, b) => a.slug.localeCompare(b.slug))) {
  const notes = [];
  if (row.face > FACE_HEIGHT + 0.03) notes.push('too close - needs a wider photo');
  if (Math.abs(row.eye - EYE_LINE) > 0.03) notes.push('no headroom - needs space above the head');
  if (row.width < 508) notes.push('too low-res for a 2x display');
  console.log(
    `${row.slug.padEnd(24)}  ${pct(row.face).padStart(6)}  ${pct(row.eye).padStart(6)}  ` +
      `${String(row.width).padStart(4)}  ${String(Math.round(row.size / 1024)).padStart(4)}KB  ${notes.join('; ')}`
  );
}
