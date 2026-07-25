# Deploying to Bluehost

The site is a fully static Astro build (`output: 'static'` in `astro.config.mjs`),
so Bluehost shared hosting can serve it directly. There is no Node runtime, no
adapter, and no server routes in production. Keystatic runs in dev only.

## Build

```sh
cd site
npm ci
npm run check     # must be 0 errors
npm run build     # writes dist/
```

`dist/` is the complete deployable artifact, including `dist/.htaccess`.

## Upload

Copy the **contents** of `dist/` (not the folder itself) into the directory
Bluehost serves, normally `public_html/`.

`.htaccess` is a dotfile. Many FTP clients hide dotfiles by default and will
silently skip it, which is the most likely way this deploy goes wrong: the site
will appear to work while every redirect, cache header, and security header is
missing. Turn on "show hidden files" and confirm `public_html/.htaccess` exists
after uploading.

```sh
# Example, adjust host/user/path:
rsync -av --delete dist/ user@host:~/public_html/
```

`--delete` matters. Without it, files removed from the repo (for example the
publication YAML deleted in #19) keep being served from a stale copy on the host.

## What .htaccess does

`site/public/.htaccess` is copied into `dist/` by Astro. It replaces
`public/_redirects`, which is **Cloudflare Pages syntax that Apache ignores
entirely**. Without it, these silently break on cutover:

| Concern | Handled by |
|---|---|
| Force HTTPS, strip `www` | Single 301 to `https://loudounnatureconservation.org` |
| `/history/`, `/our-history/` | 301 to `/about/#history` |
| `/wp-content/*`, `/wp-includes/*` | 301 to `/` |
| 404s | `ErrorDocument 404 /404.html` (the site's own page) |
| Compression | mod_deflate on text types; woff2 excluded (already compressed) |
| Caching | `_astro/*` 1y immutable (content-hashed); `assets/*` 1 week (stable names); HTML always revalidates |
| Security | `nosniff`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN` |
| Config files | `.htaccess` and `_redirects` denied |

Two non-obvious details, both found by running a real Apache 2.4 against `dist/`
rather than by reading the config:

1. **The HTTPS test must be AND, not OR.** Bluehost terminates TLS ahead of
   Apache, so `%{HTTPS}` reads `off` on requests that arrived over HTTPS. An
   `[OR]` chain redirects an already-secure request back to itself forever. The
   rule requires *both* `X-Forwarded-Proto != https` *and* `%{HTTPS} != on`.
2. **Redirect targets are absolute `https://` URLs, not paths.** Given a bare
   path, Apache builds `Location:` from the scheme it thinks the request used,
   which behind the proxy is `http` - adding a needless insecure hop.

## Verify after deploying

Run against the live host. Every line should match.

```sh
SITE=https://loudounnatureconservation.org

# 1. No redirect loop. Must be 200, not 301.
curl -sI $SITE/ | head -1
curl -sI $SITE/team/ | head -1

# 2. Canonical host and scheme, one hop each.
curl -sI http://loudounnatureconservation.org/team/     | grep -i ^location
curl -sI https://www.loudounnatureconservation.org/team/ | grep -i ^location

# 3. Legacy redirects, and the #history fragment must survive unescaped.
curl -sI $SITE/history/     | grep -i ^location   # -> /about/#history
curl -sI $SITE/our-history/ | grep -i ^location
curl -sI $SITE/wp-content/uploads/x.png | grep -i ^location

# 4. The site's own 404, not Bluehost's.
curl -s $SITE/definitely-not-a-page/ | grep -o '<title>[^<]*'

# 5. Cache tiers.
curl -sI $SITE/ | grep -i ^cache-control                 # max-age=0, must-revalidate
curl -sI $SITE/assets/lncp-logo.png | grep -i ^cache-control   # max-age=604800

# 6. Config files must not be readable.
curl -s -o /dev/null -w '%{http_code}\n' $SITE/.htaccess   # 403 (or 404)
```

Then load `/team` and `/` in a browser and click a card to confirm the flip
interaction works, since that is script-driven and not covered by curl.

## Open items before the first deploy

These need a human decision; they are not settled in the repo.

- **`www` vs bare host.** The config redirects `www` -> bare, matching
  `site: 'https://loudounnatureconservation.org'` in `astro.config.mjs`. If DNS
  or an SSL cert is set up for `www` as primary, flip both this file and
  `astro.config.mjs` together - they must agree, or canonical tags will fight the
  served URL.
- **WordPress `/?page_id=NNN` URLs.** `public/_redirects` noted these were
  handled by a Cloudflare Worker, which will not exist on Bluehost. Apache *can*
  match query strings, so they can be added to `.htaccess` - but someone has to
  supply the `page_id` -> path mapping. A commented template is in the file.
- **Is Cloudflare staying in front?** `_redirects` is left in the repo in case it
  is. If Cloudflare is being retired entirely, that file can be deleted.
- **There is no deploy automation.** `.github/workflows/ci.yml` only runs `check`
  and `build`. Deploys are manual uploads today. If that should be automated,
  Bluehost credentials need to go in repo secrets and a deploy job added.
- **CI checkout depth.** `ci.yml` uses `actions/checkout@v7` without
  `fetch-depth: 0`, so the clone is shallow. That is fine for the current build,
  but any feature that reads git history at build time (the sitemap `lastmod`
  work in PR #17) will silently produce wrong values until this is set.
