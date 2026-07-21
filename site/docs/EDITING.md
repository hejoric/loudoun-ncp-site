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
- **`main` is protected.** Nobody - not even the repo owner - can push
  directly to it. Every change has to arrive as a **pull request (PR)** that
  passes an automated build check first. This is a safety net, not red tape:
  it's the thing that guarantees a typo or broken edit can never take the live
  site down.

So "editing the website" always means the same three-stage journey: **change a
YAML file → get it into a pull request against `main` → merge the PR.** There
are two ways to do the first part, depending on who you are - but the PR step
is the same for everyone.

---

## Path 1: The webmaster (technical) - Keystatic editor

```bash
cd site
npm install        # first time only
npm run dev
```

Open **http://localhost:4321/keystatic** - a friendly form-based editor for
all site content. **Keystatic only writes files to your own laptop** - it has
no idea GitHub exists, and it never commits, pushes, or opens anything for
you. That part is on you (or on Claude, if you're using it to help):

```bash
git status              # see what changed
git diff                # read the actual changes
git add -A && git commit -m "Update team page"
git push                # pushes to your current branch (e.g. dev) - not main
gh pr create --fill     # opens a PR into main; short alias: gpr
```

That PR triggers an automated check (type-checking + a full production
build). Once it's green, merge the PR - `gh pr merge --merge`, or click
**Merge** on the PR page on github.com. *Only after the merge* does Cloudflare
notice the change and redeploy the live site, usually within a minute.

Nothing in this chain is automatic except two links: the build check running
when you open/update the PR, and Cloudflare redeploying after a merge.
Writing the YAML, committing, pushing, opening the PR, and merging it are all
manual steps - there's no bot doing this for you.

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
4. Scroll down to **"Commit changes."** Because `main` is protected, GitHub
   will *not* offer a plain commit here - it shows **"Propose changes"**
   instead, and automatically creates a new branch behind the scenes for you.
   Click it.
5. GitHub takes you to a **"Open a pull request"** screen. Leave the
   defaults and click **Create pull request.**
6. Wait about a minute - GitHub runs an automated check on your change. A
   green checkmark on the PR means it's safe to merge. (A red X almost always
   means a typo broke the YAML formatting - see below.)
7. Click **Merge pull request**, then **Confirm merge.** The site rebuilds
   itself and your change is live within a minute.

If something looks wrong after your edit, don't panic - every change is
recorded, and the webmaster can revert any commit in seconds. You cannot
permanently break anything - the worst case is a PR that fails its check and
never gets merged, which the live site never even sees.

For bigger changes (new pages, images, layout), send the request to the
webmaster instead.

---

## The full pipeline, at a glance

```
  Keystatic edit          git commit + push         PR into main            merge
  (your laptop only)  →   (you do this)         →   (automatic CI     →     (you click
                                                       check runs)             the button)
                                                                                   ↓
                                                                          Cloudflare notices
                                                                          the merge and
                                                                          rebuilds the site
                                                                          (automatic, ~1 min)
```

| Step | What happens | Who/what does it |
|---|---|---|
| Edit in Keystatic | Writes YAML to disk | Keystatic (local only - never talks to GitHub) |
| `git commit` / `git push` | Change reaches GitHub, on a branch | You |
| Open a PR into `main` | Registers the change for review | You (`gpr` / `gh pr create`) |
| Build + type-check runs | Confirms the site still builds | **Automatic**, triggered by the PR |
| Merge the PR | Change actually lands on `main` | You (`gh pr merge --merge`, or the Merge button) |
| Site redeploys | Live site updates | **Automatic**, triggered by the merge |

Two rules worth memorizing: **nothing reaches the live site until a PR is
merged**, and **nothing merges a PR for you** - even with zero required
reviewers, a human always clicks the button.

### How to check where a change actually is

- **"Did my push make it to GitHub?"** Run `git status` (or `gst`) - if it
  says "ahead of origin," it's still only on your machine; push again.
- **"Is my PR ready to merge?"** Open the PR on github.com, or run
  `gh pr checks` (`prc`) - green means the build passed.
  `gh pr view --web` (`prv`) opens it in your browser.
- **"Is it actually live yet?"** Check the
  [Cloudflare Pages dashboard](https://dash.cloudflare.com) - it lists every
  deployment with the exact commit it built and a Success/Failed status. Only
  a deployment tied to a `main` commit is the real live site.

### Shortcuts (webmaster's shell)

If you're comfortable in the terminal, these aliases turn the git/PR dance
into a few keystrokes (defined in the webmaster's personal dotfiles, not this
repo - ask them to set these up on your machine too if you want them):

| Alias | Does |
|---|---|
| `gst` | `git status` |
| `gpr` | `gh pr create --fill` - opens a PR from your current branch into `main` |
| `prc` | `gh pr checks` - is the build green yet? |
| `prv` | `gh pr view --web` - open the PR in the browser |
| `prm` | `gh pr merge --merge` - merge once checks pass |

---

## Fixing a mistake (webmaster)

Every deploy corresponds to a git commit, so rollback is a revert - same PR
process as any other change, since it still has to land on protected `main`:

```bash
git revert <bad-commit-sha>
git push                # to a branch
gh pr create --fill --title "Revert: <what broke>"
gh pr merge --merge     # once the build check passes
```

Or in the GitHub UI: open the bad commit, click **"Revert"** - GitHub creates
the revert PR for you automatically. Merge it the same way as any PR.
Cloudflare redeploys the previous content within a minute of the merge.

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
