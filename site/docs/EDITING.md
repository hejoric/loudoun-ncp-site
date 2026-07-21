# How to Edit the LNCP Website

A guide for everyone who touches the site: the webmaster, the director, and
whoever inherits this next. No question here is too basic - this doc assumes
nothing.

## How the site works (30-second version)

- The website is a **static site**: every page is pre-built into plain HTML
  files and served from Cloudflare's CDN. There is no server, no database, and
  no admin panel on the live site. This is why it is fast, free to host, and
  has essentially nothing to hack.
- All content (team members, events, publications, page text) lives as **YAML
  files** in this git repository, under `site/src/content/`.
- When a change lands on the `main` branch on GitHub, Cloudflare Pages
  automatically rebuilds and deploys the site. Live in about a minute.

So "editing the website" always means the same thing: **change a YAML file,
commit it to `main`.** There are two ways to do that, depending on who you are.

---

## Path 1: The webmaster (technical) - Keystatic editor

```bash
cd site
npm install        # first time only
npm run dev
```

Open **http://localhost:4321/keystatic** - a friendly form-based editor for
all site content. When you save, it writes the YAML files on disk for you.
Review and ship:

```bash
git status         # see what changed
git diff           # read the actual changes
git add -A && git commit -m "Update team page"
git push
```

The live site updates automatically after the push.

### What is editable where

| Content | Keystatic section | Files |
|---|---|---|
| Team bios, roles, headshots | Team Members | `src/content/team/*.yaml` |
| School branches | Branches | `src/content/branches/*.yaml` |
| Research papers | Research Publications | `src/content/publications/*.yaml` |
| Events | Events | `src/content/events/*.yaml` |
| Home page text, stats, press | Home Page | `src/content/singletons/home/index.yaml` |
| About page | About Page | `src/content/singletons/about/index.yaml` |
| Contact info, social links | Site Settings | `src/content/singletons/settings/index.yaml` |

Images go in `public/assets/` (team headshots in `public/assets/team/`,
school logos in `public/assets/branches/`). Keystatic places uploaded images
there automatically; you can also copy files in manually.

---

## Path 2: The director (non-technical) - GitHub web editor

You do not need to install anything. You need a free GitHub account and
collaborator access to the repo (the webmaster grants this in
GitHub → repo → Settings → Collaborators).

To fix text - a bio, an event description, a stat:

1. Go to the repository on github.com and navigate to the file. Example: for
   a team member, browse to `site/src/content/team/` and click the person's
   file.
2. Click the **pencil icon** (top right of the file view).
3. Edit the text. YAML is just `field: value` lines - change the words after
   the colon, and don't change the field names or indentation.
4. Click **Commit changes** (green button). Commit directly to `main`.
5. Done. The site rebuilds itself and your change is live in about a minute.

If something looks wrong after your edit, don't panic - every change is
recorded, and the webmaster can revert any commit in seconds. You cannot
permanently break anything.

For bigger changes (new pages, images, layout), send the request to the
webmaster instead.

---

## Fixing a mistake (webmaster)

Every deploy corresponds to a git commit, so rollback is:

```bash
git revert <bad-commit-sha>
git push
```

...or in the GitHub UI: open the commit, click "Revert". Cloudflare redeploys
the previous content automatically.

---

## Future options (only if genuinely needed)

If one day there are several regular non-technical editors and the GitHub web
editor isn't enough, the supported path is **Keystatic GitHub mode**: the same
form UI as Path 1, but hosted on the live site behind a GitHub login.

Know before starting:

- It requires a small server for its login/API routes. **Cloudflare Pages
  cannot run it** (its Workers runtime has no filesystem, which this site's
  build needs - this was tested, not guessed). Hosting would move to Netlify
  or Vercel, where Keystatic + Astro work natively.
- Editors still need GitHub accounts with repo access - which is exactly what
  Path 2 already requires. So the only gain over Path 2 is a nicer form UI.
- Setup: GitHub OAuth app + env vars + `storage: { kind: 'github' }` in
  `keystatic.config.ts`. See https://keystatic.com/docs/github-mode

Until that day: keep it simple. Static site, two editing paths, zero
infrastructure.
