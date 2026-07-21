# Loudoun Nature Conservation Project - Website

Static site for [loudounnatureconservation.org](https://loudounnatureconservation.org) built with Astro + Tailwind CSS + Keystatic.

## Stack

| Layer | Technology |
|---|---|
| Framework | Astro 7 (static output) |
| Styles | Tailwind CSS v4 |
| CMS | Keystatic (git-based, YAML files) |
| Hosting | Cloudflare Pages |
| Font | Montserrat (self-hosted) |

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
| Home | `src/content/singletons/home/index.yaml` | Hero headline, stats, press links |
| About | `src/content/singletons/about/index.yaml` | Mission, timeline, what we do, impact |
| Site Settings | `src/content/singletons/settings/index.yaml` | Org name, contact email, social URLs, volunteer form |

## Adding a Team Member

1. Create `src/content/team/first-last.yaml`:

```yaml
name: First Last
role: Your Role
section: Executive  # Executive | Directors | Executive Staff | Branch Presidents | Branch Staff
branch: null        # branch slug (e.g. "potomac-falls") only for Branch Presidents/Staff
bio: A short bio paragraph.
headshot: null      # /assets/team/first-last.jpg once uploaded
email: null
instagram: null
linkedin: null
featuredOnHome: false
sortOrder: 99
```

2. Place headshot at `public/assets/team/first-last.jpg` (400x400px, <100KB).

## Adding a Branch

1. Create `src/content/branches/branch-slug.yaml`:

```yaml
name: Branch Name High School
school: School Full Name
schoolLogo: null      # /assets/branches/school-name.png once uploaded
accentColor: '#4c0519'
```

2. Place school logo at `public/assets/branches/school-name.png` (200x200px transparent PNG, <50KB).

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
| Team headshots | `public/assets/team/` | 400x400px, JPEG, <100KB |
| School logos | `public/assets/branches/` | 200x200px transparent PNG, <50KB |
| Hero video | `public/assets/hero.mp4` | 1280px wide, H.264, CRF 26, no audio, <2MB |
| Hero poster | `public/assets/hero-poster.jpg` | JPEG still from video, same dimensions |
| Research PDFs | `public/research/` | PDF, any size |

### Recompressing the hero video

```bash
ffmpeg -i input.mp4 -vf scale=1280:-2 -c:v libx264 -crf 26 -an -movflags +faststart public/assets/hero.mp4
ffmpeg -i public/assets/hero.mp4 -vframes 1 -ss 00:00:02 -update 1 public/assets/hero-poster.jpg
```

## Deployment (Cloudflare Pages)

1. Push to GitHub.
2. In Cloudflare Pages dashboard, connect the repo.
3. Set build settings:
   - Build command: `npm run build`
   - Build output directory: `site/dist`
   - Root directory: `site`
   - Node.js version: `22`

No environment variables are required.

## Editing Workflows

See **[docs/EDITING.md](docs/EDITING.md)** - the runbook for everyone who
edits the site:

- **Webmaster**: Keystatic editor at `localhost:4321/keystatic` during `npm run dev`
- **Director / non-technical editors**: edit YAML files directly in GitHub's
  web editor (requires repo collaborator access); the site auto-deploys

There is intentionally no web-hosted CMS: the deployed site is 100% static
with zero attack surface. `docs/EDITING.md` documents the supported upgrade
path (Keystatic GitHub mode on Netlify/Vercel) if that ever becomes necessary -
note it cannot run on Cloudflare Pages.

## URL Redirects

`public/_redirects` handles old WordPress paths. Cloudflare Pages does not support query-string matching, so `/?page_id=NNN` redirects from the old WordPress site cannot be handled here - they would require a Cloudflare Worker if needed.

## Project Structure

```
site/
  src/
    components/     # Nav, Footer, FlipCard, BranchCard, PublicationCard, InitialsAvatar
    content/        # YAML content files (Keystatic collections + singletons)
    layouts/        # Base.astro (HTML shell with meta/SEO)
    lib/            # reader.ts (Keystatic build-time data access)
    pages/          # One .astro file per route
    styles/         # global.css (Tailwind + custom theme tokens)
  public/
    assets/         # Fonts, logos, headshots, hero video
    research/       # PDFs
    _redirects      # Cloudflare Pages URL redirects
  docs/
    EDITING.md      # Editing runbook for webmaster + non-technical editors
  keystatic.config.ts
  astro.config.mjs
```
