# Deploying

The site is a fully static Astro build (`output: 'static'`), hosted on **Vercel**.
There is no Node runtime, no adapter, and no server routes in production.
Keystatic (the `/keystatic` editor) runs in dev only.

The domain is *registered* at Bluehost, and DNS is hosted at **Cloudflare**,
used as an authoritative DNS provider only. Bluehost no longer serves anything.

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

## DNS

| | |
|---|---|
| Registrar | Bluehost |
| DNS host | Cloudflare, free plan, **DNS only** |
| Nameservers | `maeve.ns.cloudflare.com`, `vern.ns.cloudflare.com` |
| Apex | `A` -> `76.76.21.21` (exactly one record) |
| `www` | `CNAME` -> `cname.vercel-dns.com` |
| Rollback IP | `162.241.224.221` |

**Records are changed in Cloudflare, never at Bluehost.** Bluehost is only the
registrar now. Its Zone Editor still renders the old zone and still accepts
edits, but it is no longer authoritative, so changes made there do nothing. The
only thing Bluehost is still used for is the nameserver delegation itself.

Vercel now recommends a per-project CNAME (`1da9cb1cd7691bfc.vercel-dns-017.com`,
resolving into its expanded `64.29.17.x` / `216.198.79.x` range) for both the
apex and `www`, in place of the legacy `76.76.21.21` and `cname.vercel-dns.com`.
Vercel states the legacy records keep working, so this is future-proofing rather
than a fix. A CNAME at the apex is only possible because Cloudflare flattens root
CNAMEs automatically, which it does regardless of proxy status - that would be
illegal in a conventional zone file.

**Every record in the Cloudflare zone must stay "DNS only" (grey cloud).** The
dashboard will nag that the zone is "not fully protected". Ignore it. Proxying is
not a missing optimisation here, it actively breaks four things:

- Vercel answers its certificate validation challenge at the apex. A proxy in
  front intercepts it and the certificate never issues.
- `vercel.json` sends HSTS. Combined with Cloudflare's Flexible SSL mode that is
  an infinite redirect loop.
- It overrides the deliberate cache tiers in `vercel.json`.
- The three DKIM CNAMEs (`brevo1._domainkey`, `brevo2._domainkey`,
  `litesrv._domainkey`) would resolve to Cloudflare IPs instead of their real
  targets, silently breaking outbound mail signing.

Vercel is already the CDN, with its own TLS and DDoS mitigation, and the site is
static files - no PHP, no database, no `wp-login.php`. There is no origin left
for a WAF to protect.

### Why DNS is not at Bluehost

Two reasons, both found the hard way.

**The apex `A` record is not editable at Bluehost.** The domain is the cPanel
account's primary domain, so its `A` record carries a `hosting` tag and the Zone
Editor refuses to either edit or delete it. The only way to release it there is
detaching the domain from the hosting account, which also takes out cPanel, FTP
and webmail access. Deleting the sibling `hosting` records (`cpanel`, `ftp`,
`webmail`, `whm`, ...) does nothing - they are siblings, not parents.

**Bluehost's bundled Cloudflare CDN kept coming back.** While it is on, the
published apex `A` is a Cloudflare partner IP (`66.235.200.145`) proxying to
Bluehost, which answers `403` with `cf-mitigated: challenge` to anything that is
not a browser, including search crawlers and uptime monitors. Toggling it off in
cPanel did not stick, and for a while `ns1` and `ns2.bluehost.com` served three
different versions of the zone simultaneously.

`66.235.200.145` is *not* a rollback target. It only ever existed as that partner
IP and disappears with the integration. The real Bluehost origin, and the actual
rollback target, is `162.241.224.221`.

### Mail lives in this zone

Moving the site must not disturb it. Load-bearing records: `MX 1
smtp.google.com` (Google Workspace), seven apex `TXT` records (SPF plus Google,
Zoho, MailerLite, Brevo and Anthropic verifications), `google._domainkey`,
`zmail._domainkey`, `_dmarc`, and the three DKIM CNAMEs above.

This is also why the zone was migrated by letting Cloudflare import it rather
than by switching to Vercel's nameservers: the latter means hand-retyping ~20
records including two long DKIM public keys, where one typo silently breaks mail.

Two pre-existing defects, unrelated to the cutover and still open:

1. **Two `zmail._domainkey` TXT records** with different Zoho DKIM keys. Two
   records at one selector make DKIM verification unreliable. Keep only the
   2048-bit `MIIBIjANBg...` key.
2. **SPF does not authorise Google Workspace.** It reads `v=spf1 a mx
   include:zohomail.com include:_spf.mlsend.com ~all`: no
   `include:_spf.google.com` despite Google handling the mail, and no Brevo
   include despite Brevo DKIM being set up. `a` and `mx` authorise the web server
   and the inbound mail servers, neither of which sends anything. DMARC `p=none`
   is currently hiding the failures.

### Cutover procedure

Reversible at every step, which is the whole reason it is safe. Nothing is
deleted - the WordPress install stays in `public_html`.

1. Verify the build on `loudoun-ncp.vercel.app` first. The live domain is
   untouched until step 5.
2. Add `loudounnatureconservation.org` and `www.` to the Vercel project.
3. Add the domain to Cloudflare as a Free zone and let it import the existing
   records. Check the import by hand against the old zone - it must not lose the
   mail records above.
4. Set the apex `A` and `www` `CNAME` per the table, delete any leftover `A` ->
   `162.241.224.221`, and set **every** record to DNS only.
5. Change the nameservers at the Bluehost *registrar* section, not cPanel, to the
   Cloudflare pair.
6. Wait for Vercel to report the certificate as issued, then run the verification
   below and the deploy verification block above.

**Rollback:** point the apex `A` at `162.241.224.221` in Cloudflare. WordPress
starts serving again as DNS propagates. In Cloudflare this is a 30-second edit,
which it was not at Bluehost.

### Verifying DNS

Query Cloudflare authoritatively. Public resolvers cached the old Bluehost
records with 4-hour TTLs, so for the first few hours after a change they
disagree with the zone and that is not a fault:

```sh
D=loudounnatureconservation.org
NS=maeve.ns.cloudflare.com

dig +short NS    $D                 # -> maeve/vern.ns.cloudflare.com
dig +short A     $D @$NS            # -> 76.76.21.21, and nothing else
dig +short CNAME www.$D @$NS        # -> cname.vercel-dns.com
dig +short MX    $D @$NS            # -> 1 smtp.google.com
dig +short TXT   $D @$NS | wc -l    # -> 7
```

A second IP alongside `76.76.21.21` in the *authoritative* answer means a
duplicate apex `A` survived the import. Vercel will not issue a certificate
while the apex resolves anywhere but its own IP, so HTTPS stays broken until
that record is gone. The signature of this state is `curl -sI http://$D/`
returning `Server: Vercel` on port 80 while HTTPS fails the TLS handshake
outright, because there is no certificate to present yet.

### Cloudflare error 525, and why it is not a Cloudflare problem

Hit during the cutover. Worth recording because every instinct it triggers is
wrong.

The symptom is a Cloudflare-branded **error 525, "SSL handshake failed"**, on a
domain whose Cloudflare zone is entirely grey-clouded. The instinct is that a
record got proxied by accident. It did not. Check with
`curl -o /dev/null -w '%{remote_ip}' https://$D/`: the request is going to
`66.235.200.145`, the *old Bluehost Cloudflare partner IP*, which clients hold in
cache for up to 4 hours after the migration. That partner zone still exists on
Cloudflare's edge, still answers for the hostname, and now proxies to an origin
that resolves to Vercel. Vercel had no certificate yet, so the edge-to-origin TLS
handshake failed, which is exactly what 525 reports.

Two independent facts produced it: a stale DNS answer, and a missing certificate.
Neither is a Cloudflare configuration error, and changing anything in the
Cloudflare zone makes it worse.

The fix is to issue the certificate, which also silences the 525 for clients
still on the stale path, because the origin handshake then succeeds:

```sh
npx vercel certs issue loudounnatureconservation.org www.loudounnatureconservation.org
npx vercel certs ls | grep -i loudoun
```

Vercel usually issues automatically once a domain verifies, but it did not fire
here and needed the explicit nudge. Confirm the certificate covers both
hostnames, not just the apex:

```sh
echo | openssl s_client -connect 76.76.21.21:443 -servername $D 2>/dev/null \
  | openssl x509 -noout -text | grep -A1 "Subject Alternative Name"
# -> DNS:loudounnatureconservation.org, DNS:www.loudounnatureconservation.org
```

Note that `dig` and the browser can disagree during this window. On macOS `dig`
queries the configured resolver directly while browsers and curl go through
`getaddrinfo` and `mDNSResponder`, which keeps its own cache. A green `dig` result
alongside a broken browser is that split, not a zone fault. `sudo dscacheutil
-flushcache && sudo killall -HUP mDNSResponder` resolves the local half.

**Remaining cleanup:** ask Bluehost to fully remove the Cloudflare partner zone.
Until they do, `66.235.200.145` can still serve this site through configuration
nobody here controls. Harmless once caches expire and nothing resolves there, but
it should not be left indefinitely.

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
