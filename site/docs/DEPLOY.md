# Deploying

The site is a fully static Astro build (`output: 'static'`), hosted on **Vercel**.
There is no Node runtime, no adapter, and no server routes in production.
Keystatic (the `/keystatic` editor) runs in dev only.

The domain is *registered* at Bluehost, but Bluehost no longer serves anything.
Only DNS lives there.

## Project layout

The repo root is not the app root. In Vercel the project's **Root Directory is
`site`**, so `site/package.json`, `site/vercel.json`, and `site/dist` are what
Vercel sees. Changing that setting breaks the build.

| | |
|---|---|
| Vercel project | `hejorics-projects/loudoun-ncp` |
| Production alias | `loudoun-ncp.vercel.app` |
| Framework preset | `astro` (pinned in `vercel.json`) |
| Output | `dist` |

## Deploying

Normal path is git: pushing to `main` deploys to production, and every PR gets
its own preview URL.

Manual deploy from a local checkout:

```sh
cd site
npm ci
npm run check     # must be 0 errors
npm run build
npx vercel --prod
```

Preview (not production):

```sh
npx vercel
```

Preview deployments are protected by Vercel SSO and will answer `302` to
`vercel.com/sso-api` for anonymous requests, including curl. That is not a
redirect bug - to smoke-test redirects and headers with curl you need the
production alias, or the deployment protection turned off for that deploy.

## What vercel.json does

`site/vercel.json` replaces the old `public/_redirects`, which was Cloudflare
Pages syntax and is ignored by Vercel.

| Concern | Handled by |
|---|---|
| `/history/`, `/our-history/` | 308 to `/about/#history` |
| `/wp-content/*`, `/wp-includes/*`, `/xmlrpc.php` | 308 to `/` |
| Trailing slashes | `trailingSlash: true`, matching Astro's directory output and every internal link |
| Caching | `_astro/*` 1y immutable (content-hashed); `assets/*` 1 week; HTML revalidates |
| Security | `nosniff`, `Referrer-Policy`, `X-Frame-Options`, HSTS |
| HTTPS + certs | Automatic, nothing to configure |

**The one non-obvious rule: redirect `source` values must carry the trailing
slash.** Vercel applies `trailingSlash` normalization *before* matching
redirects, so a source of `/history` never matches - the request has already
become `/history/`. Writing it without the slash silently turns the legacy
WordPress URLs into 404s, which is exactly the failure this file exists to
prevent. Verified against a real deploy, not inferred.

## Verify after deploying

```sh
SITE=https://loudounnatureconservation.org   # or the vercel.app alias

# Pages
for p in / /about/ /team/ /volunteer/ /contact/ /events/ /funding/ /research/; do
  echo "$p $(curl -s -o /dev/null -w '%{http_code}' $SITE$p)"; done

# Legacy WordPress URLs - the #history fragment must survive
curl -sI $SITE/history/     | grep -i ^location   # -> /about/#history
curl -sI $SITE/our-history/ | grep -i ^location
curl -sI $SITE/wp-content/uploads/x.png | grep -i ^location

# The site's own 404, not a host default
curl -s $SITE/definitely-not-a-page/ | grep -o '<title>[^<]*'

# Cache tiers
curl -sI $SITE/ | grep -i ^cache-control                      # max-age=0, must-revalidate
curl -sI $SITE/assets/lncp-logo.png | grep -i ^cache-control  # max-age=604800
```

Card flips are script-driven and invisible to curl. After a deploy that touches
`FlipCard.astro`, `BranchCard.astro`, or the `.card-flip*` rules in
`global.css`, load `/team/` and click a card - and check it with
`prefers-reduced-motion: reduce` emulated, because that path swaps the two faces
with `display` instead of rotating them and has broken before (the back rendered
blank, costing every team bio).

## DNS cutover (one time)

Done once when moving off Bluehost/WordPress. Recorded here because it is
reversible and worth knowing how.

1. Verify the build on `loudoun-ncp.vercel.app` first. The live domain is
   untouched until step 3, so there is no rush.
2. In Bluehost cPanel, **disable the bundled Cloudflare CDN integration**. While
   it is on, the apex A record points at a Cloudflare partner IP that proxies to
   Bluehost, and it will keep intercepting traffic.
3. Add `loudounnatureconservation.org` and `www.` to the Vercel project, then
   set the records Vercel shows at Bluehost (apex `A` -> Vercel's IP, `www`
   `CNAME` -> `cname.vercel-dns.com`).
4. Wait for Vercel to report the certificate as issued.
5. Re-run the verification block above against the real domain.

**Rollback:** point the A record back at the Bluehost IP. The WordPress install
is still in `public_html` and starts serving again as DNS propagates. Nothing is
deleted as part of the cutover, which is the whole reason it is safe.

Keep `astro.config.mjs`'s `site:` value and the canonical host in agreement -
today both are the bare apex, and `www` redirects to it. If that ever flips,
change both together or canonical tags will contradict the served URL.

## The Root Directory trap

This one has already broken production once, so it is worth stating plainly.

The Vercel project's **Root Directory must be `site`**. If it is `.`, a
git-triggered build runs from the repo root, finds no app, and publishes an
empty deployment - every route 404s, including the homepage.

What makes it nasty is that **CLI deploys hide it**. Running `npx vercel --prod`
from inside `site/` makes that directory the upload root, so the CLI path keeps
working perfectly while every git-triggered deploy is broken. The two paths
disagree, and only one of them is what a `git push` actually uses.

So: after any change to the project's build settings, verify with a **git-
triggered** deploy, not a CLI one. Merge something small and curl the production
alias. A CLI deploy proves nothing about the git path.

```sh
# check the current setting without opening the dashboard
npx vercel project inspect loudoun-ncp | grep -i 'root directory'
```
