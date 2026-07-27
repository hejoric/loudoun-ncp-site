/**
 * Regenerates every favicon / app icon from public/assets/lncp-logo.png.
 *
 * Run with `npm run icons` after the logo changes. The icons used to be made by
 * hand, which is how they drifted: the logo was re-saved but the icons were not,
 * and the tab icons had been produced by cropping to the logo's inner ring and
 * flattening its transparency onto white. The logo is a coral disc inscribed in
 * a square canvas touching all four edges, so ~21.5% of it (the corner
 * triangles) is transparent - flattening that on white left a pale pink matte
 * that read as a white outline around the icon at 16-48px.
 *
 * So: never crop, and keep the alpha. The one exception is the Apple touch icon,
 * which must be opaque because iOS ignores alpha and would composite the corners
 * onto black.
 */
import { Buffer } from 'node:buffer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'public/assets/lncp-logo.png');

/** The disc fill in lncp-logo.png. Used as the Apple touch icon's matte so the
 *  flattened corners disappear into the artwork instead of reading as a frame. */
const CORAL = { r: 255, g: 87, b: 87, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/** `fit: 'contain'` with a transparent background rather than the default
 *  `cover`: the source is already square, so contain is a no-op on framing here,
 *  but it guarantees no crop if the logo is ever re-exported non-square. */
const render = (size, background) =>
  sharp(SRC)
    .resize(size, size, { kernel: 'lanczos3', fit: 'contain', background })
    .flatten(background.alpha === 1 ? { background } : false)
    .png({ compressionLevel: 9 })
    .toBuffer();

/**
 * Packs PNG payloads into a real ICO container. sharp cannot write ICO, and the
 * file this replaces was a bare PNG named `.ico` - browsers sniff it, but the
 * declared type was a lie and only one size was available.
 *
 * Layout: ICONDIR (6 bytes), then one 16-byte ICONDIRENTRY per image, then the
 * payloads. A 0 in the width/height byte means 256; we never go that large here.
 */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = header.length + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size % 256, 0); // width  (0 => 256)
    entry.writeUInt8(size % 256, 1); // height (0 => 256)
    entry.writeUInt8(0, 2); // palette size: 0 for truecolor
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const out = async (relPath, data) => {
  const file = path.join(ROOT, relPath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
  console.log(`  ${relPath} (${data.length.toLocaleString()} bytes)`);
};

console.log(`Generating icons from ${path.relative(ROOT, SRC)}`);

// Tab icons: alpha preserved, so the round badge keeps its silhouette on both
// light and dark browser chrome.
const tabSizes = [16, 32, 48];
const tabIcons = await Promise.all(
  tabSizes.map(async (size) => ({ size, data: await render(size, TRANSPARENT) }))
);
for (const { size, data } of tabIcons) {
  await out(`public/assets/favicon-${size}x${size}.png`, data);
}

await out('public/favicon.ico', buildIco(tabIcons));

// iOS home screen: opaque, matted on the disc colour (see CORAL above).
await out('public/assets/apple-touch-icon.png', await render(180, CORAL));

// Android / PWA, referenced by public/site.webmanifest. The manifest sets its
// own background_color, so these keep their transparency.
for (const size of [192, 512]) {
  await out(`public/assets/android-chrome-${size}x${size}.png`, await render(size, TRANSPARENT));
}

console.log('Done.');
