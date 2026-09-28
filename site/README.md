# Loudoun Nature Conservation Project - Website

Static site for [loudounnatureconservation.org](https://loudounnatureconservation.org) built with Astro + Tailwind CSS + Keystatic.

## Stack

| Layer | Technology |
|---|---|
| Framework | Astro 7 (static output) |
| Styles | Tailwind CSS v4 |
| CMS | Keystatic (git-based, YAML files) |
| Hosting | Vercel (static) |
| Fonts | System font stacks (serif display, sans body) - no web fonts are loaded |

## Local Development

### Prerequisites

- Node.js >= 22.12.0
- npm >= 9

### Setup

```bash
cd site
npm install
npm run dev
```

The dev server starts at `http://localhost:4321`.

The Keystatic admin UI is available at `http://localhost:4321/keystatic` while the dev server is running. It reads and writes YAML files directly under `src/content/`.

### Build

```bash
npm run build
```

Output goes to `dist/`. The Keystatic admin is excluded from production builds - content is managed locally and deployed via git.

## Editing Content (Keystatic)

Start the dev server, then visit `http://localhost:4321/keystatic`.

### Collections (lists of items)

| Collection | Location | What it controls |
|---|---|---|
| Team Members | `src/content/team/*.yaml` | Bios, roles, headshots, sections |
| Branches | `src/content/branches/*.yaml` | School branches, logos, colors |
| Publications | `src/content/publications/*.yaml` | Research papers, abstracts, PDFs |
| Events | `src/content/events/*.yaml` | Cleanups, workshops, volunteer events |

### Singletons (one-of-a-kind pages)

| Singleton | Location | What it controls |
|---|---|---|
| Home | `src/content/singletons/home.yaml` | Hero headline, stats, press links |
| About | `src/content/singletons/about.yaml` | Mission, what we do, values, impact |
| Site Settings | `src/content/singletons/settings.yaml` | Org name, contact email, social URLs, volunteer form |

## Adding a Team Member

1. Create `src/content/team/first-last.yaml`:

```yaml
name: First Last
role: Your Role
section: Executive  # Executive | Directors | Executive Staff | Branch Presidents | Branch Staff
branch: null        # branch slug (e.g. "potomac-falls") - their school, see "Schools on a card"
bio: A short bio paragraph.
headshot: null      # /src/assets/team/first-last/headshot.webp once cropped
headshotPosition: null  # CSS object-position, e.g. "center 27%" - leave blank for top
headshotScale: null     # e.g. "0.9" to zoom out - leave blank for 1
email: null
instagram: null
linkedin: null
website: null
affiliations: []    # extra schools beyond their branch, see "Schools on a card"
featuredOnHome: false
sortOrder: 99
```

2. Crop the headshot with `npm run headshots` (see "Headshots" in
   [docs/EDITING.md](docs/EDITING.md)), which writes
   `src/assets/team/first-last/headshot.webp`, and point `headshot` at it.

### Schools on a card

A member can show more than one school - most branch presidents are seniors, so
once they are accepted to college they have a high school badge and a college
badge side by side. The two come from different places:

- **Their school comes from `branch`.** The branch record owns the school name
  and logo, so a branch member never uploads a school logo. This works for any
  section, not just Branch Presidents.
- **Anything else goes in `affiliations`**, shown in the order listed after the
  branch school:

```yaml
branch: dominion            # Dominion High School badge, from the branch record
affiliations:
  - name: University of Virginia
    logo: /src/assets/affiliations/first-last/affiliations/0/logo.png
```

An entry with no `logo` yet still gets its name printed under the card, so a
college can be announced before its logo is sourced. Up to three badges are
shown per card; any beyond that appear as names only.

The `affiliations/<index>/logo` path above is where Keystatic files an uploaded
logo. Any path under `src/assets/affiliations/` works if you hand-write the YAML, but Keystatic
moves the file to that canonical path the next time the entry is saved in the
editor - so it is simpler to put it there to begin with.

## Adding a Branch

1. Create `src/content/branches/branch-slug.yaml`:

```yaml
name: Heritage                 # short branch name, shown on the card
school: Heritage High School   # full school name, shown on the badge
schoolLogo: null               # /src/assets/branches/heritage/schoolLogo.png once uploaded
```

2. Place the school logo at `src/assets/branches/branch-slug/schoolLogo.png`
   (square transparent PNG, at least 200x200px) and point `schoolLogo` at it.
   That is the path Keystatic uses when the logo is uploaded in the editor.

A branch with no logo yet is fine - the badge falls back to the school's
initials ("HHS"). A branch record is only rendered through the members that
reference it, so adding one ahead of its president changes nothing on the site
until a member sets `branch: branch-slug`.

A branch that is not running this year gets `hidden: true` (the **Hidden**
checkbox in Keystatic) instead of being deleted. The record stays for when it
returns, but the site stops listing it and drops its school badge from members'
cards. To keep that school on one member's card anyway (as the founders do for
Potomac Falls), list it under their `affiliations`.

## Adding an Event

Create `src/content/events/event-slug.yaml`:

```yaml
title: Event Title
date: '2026-08-01'
location: Park Name, Ashburn VA
description: Short description for the listing.
signupLink: https://forms.google.com/...
```

Past events (date < today) automatically move to the "Past Events" section.

## Adding a Research Publication

1. Place the PDF at `public/research/filename.pdf`.
2. Create `src/content/publications/paper-slug.yaml`:

```yaml
title: Full Paper Title
authors:
  - First Last
  - First Last
date: '2026-01-01'
abstract: Full abstract text.
pdfFile: /research/filename.pdf
pdfLink: null   # or external DOI URL
```

## Asset Specifications

| Asset | Path | Spec |
|---|---|---|
| Team headshots | `src/assets/team/` | WebP written by `npm run headshots` |
| School logos | `src/assets/branches/` | Square transparent PNG, at least 200x200px |
| College logos | `src/assets/affiliations/` | Square, trimmed of margins, at least 200x200px |
| Page photos | `src/assets/photos/` | JPEG, at least 1600px wide |
| Hero video | `public/assets/hero.mp4` | 1280px wide, H.264, CRF 26, no audio |
| Hero video (AV1) | `public/assets/hero-av1.mp4` | Same clip in AV1, served first to browsers that decode it |
| Hero poster | `src/assets/photos/hero-poster.jpg` | JPEG still from video, same dimensions |
| Research PDFs | `public/research/` | PDF, any size |

Images under `src/assets/` go through `astro:assets` at build time: each one is
resized to the sizes its slot actually paints and served as WebP, so a large
original costs nothing at runtime. A content image path that points anywhere
else fails the build (see `src/lib/images.ts`). `public/` is copied into the
build verbatim, so keep it for files that need a stable URL: favicons, PDFs,
the Open Graph image, and the video.

### Recompressing the hero video

```bash
ffmpeg -i input.mp4 -vf scale=1280:-2 -c:v libx264 -crf 26 -an -movflags +faststart public/assets/hero.mp4
ffmpeg -i public/assets/hero.mp4 -map 0:v:0 -dn -map_metadata -1 -c:v libsvtav1 -crf 42 -preset 4 -g 240 -pix_fmt yuv420p -an -movflags +faststart public/assets/hero-av1.mp4
ffmpeg -i public/assets/hero.mp4 -vframes 1 -ss 00:00:02 -update 1 src/assets/photos/hero-poster.jpg
```

Re-encode both files whenever the clip changes: the page offers the AV1 file
first, so a stale one keeps playing the old clip in Chrome, Edge and Firefox.
Size scales with length, so keep the clip short - the current 42 seconds is
about 6 MB as H.264 and 3.7 MB as AV1. The video only starts downloading after
the page has loaded, and never for visitors with reduced motion or Save-Data
turned on.

## Deployment (Vercel)

Merging to `main` deploys to production; every PR gets a preview URL. The
Vercel project's Root Directory is `site`, and `vercel.json` pins the build,
redirects, and headers. No environment variables are required.

See **[docs/DEPLOY.md](docs/DEPLOY.md)** for manual deploys, post-deploy checks,
and DNS.

## Editing Workflows

See **[docs/EDITING.md](docs/EDITING.md)** - the runbook for everyone who
edits the site:

- **Webmaster**: Keystatic editor at `localhost:4321/keystatic` during `npm run dev`
- **Director / non-technical editors**: edit YAML files directly in GitHub's
  web editor (requires repo collaborator access); the site auto-deploys

There is intentionally no web-hosted CMS: the deployed site is 100% static
with zero attack surface. `docs/EDITING.md` documents the supported upgrade
path (Keystatic GitHub mode) if that ever becomes necessary.

## URL Redirects

The `redirects` in `vercel.json` handle old WordPress paths (see
[docs/DEPLOY.md](docs/DEPLOY.md) for the trailing-slash rule they depend on).
Query-string URLs from the old WordPress site (`/?page_id=NNN`) are not
redirected.

## Project Structure

```
site/
  src/
    assets/         # Images optimized by astro:assets: headshots, logos, photos
    components/     # Nav, Footer, SocialLinks, FlipCard, BranchCard, PublicationCard, InitialsAvatar
    content/        # YAML content files (Keystatic collections + singletons)
    layouts/        # Base.astro (HTML shell with meta/SEO)
    lib/            # reader.ts (Keystatic build-time data access), social.ts (social profile links)
    pages/          # One .astro file per route
    styles/         # global.css (Tailwind + custom theme tokens)
  public/
    assets/         # Favicons, OG image, hero video, PDFs
    research/       # PDFs
  docs/
    DEPLOY.md       # Hosting, deploys, headers, DNS
    EDITING.md      # Editing runbook for webmaster + non-technical editors
  keystatic.config.ts
  astro.config.mjs
  vercel.json       # Redirects, cache and security headers
```
