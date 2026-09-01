/**
 * Shared SEO identity and schema.org helpers.
 *
 * Every page emits ONE `application/ld+json` block containing an `@graph` of
 * nodes that reference each other by `@id`. That consolidation matters: search
 * engines and LLM crawlers treat repeated, unlinked `Organization` blocks as
 * separate entities, whereas a stable `@id` lets them merge everything the site
 * says about LNCP into a single entity.
 */

export const SITE_URL = 'https://loudounnatureconservation.org';

export const ORG_NAME = 'Loudoun Nature Conservation Project';
export const ORG_SHORT_NAME = 'LNCP';
export const ORG_EMAIL = 'directors@loudounnatureconservation.org';
export const ORG_LOGO = `${SITE_URL}/assets/lncp-logo.png`;

/**
 * IRS Employer Identification Number. Nonprofit programs (Google for Nonprofits,
 * TechSoup, benevity, matching-gift portals) call this the "Charity ID", and
 * several of them require the site itself to display it before they will confirm
 * that the organization owns this domain. Keep it visible.
 */
export const ORG_EIN = '99-2688842';

/**
 * The registered address of record, as filed with the IRS and the Virginia SCC.
 *
 * It is also the founder's home address, so the site shows the locality sitewide
 * and confines the street line to /nonprofit-verification/ - a page that is
 * publicly reachable and linked from the footer (a human reviewer must be able
 * to find it) but carries `noindex` and stays out of the sitemap. Render
 * `street` only on that page; use `locality`/`region`/`postalCode` everywhere
 * else, including in structured data.
 */
export const ORG_ADDRESS = {
  street: '45601 Livingstone Station St',
  locality: 'Sterling',
  region: 'VA',
  postalCode: '20166-9287',
  country: 'US',
} as const;

/** "Sterling, VA 20166-9287" - the locality-only form safe for indexed pages. */
export const ORG_ADDRESS_SHORT = `${ORG_ADDRESS.locality}, ${ORG_ADDRESS.region} ${ORG_ADDRESS.postalCode}`;

/** "45601 Livingstone Station St, Sterling, VA 20166-9287" - verification page only. */
export const ORG_ADDRESS_FULL = `${ORG_ADDRESS.street}, ${ORG_ADDRESS_SHORT}`;

/** Stable entity identifiers. Never change these - they are the join keys. */
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * The founder's node lives on /team/, where the full Person is built from the
 * team collection. Everywhere else the organization references it by `@id`.
 * That reference carries the name as well, because a bare `{'@id': ...}` is
 * only resolvable by a crawler that also fetched /team/ - and an LLM reading
 * one page in isolation would see an opaque identifier where the founder's
 * name should be. The full node on /team/ merges with this stub by `@id`.
 */
export const FOUNDER_ID = `${SITE_URL}/team/#ryan-nisay`;
export const FOUNDER_NAME = 'Ryan Nisay';

/** Resolve a site-relative path to an absolute URL. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Collapse whitespace and cut to `max` characters on a word boundary.
 * Used to keep `<title>` and `<meta description>` inside SERP limits without
 * slicing mid-word (the previous behaviour on research pages).
 */
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,;:.\-]+$/, '')}…`;
}

/**
 * The organization entity. Typed as `NGO` (a subtype of Organization) so the
 * nonprofit status is machine-readable rather than only stated in prose.
 *
 * `sameAs` is passed in from the Keystatic-managed social profiles rather than
 * hardcoded here. `sameAs` is how a crawler confirms that this site and those
 * profiles are the same entity, so a list that drifts from what the site
 * actually links to is worse than no list at all.
 */
export function organizationNode({ sameAs = [] }: { sameAs?: string[] } = {}) {
  return {
    '@type': ['NGO', 'Organization'],
    '@id': ORG_ID,
    name: ORG_NAME,
    alternateName: ORG_SHORT_NAME,
    url: `${SITE_URL}/`,
    logo: {
      '@type': 'ImageObject',
      '@id': `${SITE_URL}/#logo`,
      url: ORG_LOGO,
      caption: ORG_NAME,
    },
    image: { '@id': `${SITE_URL}/#logo` },
    slogan: 'Made by Students, for Students',
    description:
      'A student-led 501(c)(3) nonprofit advancing sustainability and ecological health across Loudoun County, Virginia, through cleanups, habitat restoration, and student research.',
    email: ORG_EMAIL,
    // The Charity ID nonprofit programs verify against. `taxID` is the
    // schema.org property for it; `identifier` repeats it in the generic form
    // consumers that do not special-case `taxID` still read.
    taxID: ORG_EIN,
    identifier: {
      '@type': 'PropertyValue',
      propertyID: 'EIN',
      value: ORG_EIN,
    },
    foundingDate: '2024-04',
    founder: { '@type': 'Person', '@id': FOUNDER_ID, name: FOUNDER_NAME },
    nonprofitStatus: 'Nonprofit501c3',
    award:
      'Recognized in the United States Congressional Record by Representative Suhas Subramanyam (Virginia 10th District)',
    // No `streetAddress` here on purpose: this node is emitted on every indexed
    // page, and the street line is the founder's home. See ORG_ADDRESS.
    address: {
      '@type': 'PostalAddress',
      addressLocality: ORG_ADDRESS.locality,
      addressRegion: ORG_ADDRESS.region,
      postalCode: ORG_ADDRESS.postalCode,
      addressCountry: ORG_ADDRESS.country,
    },
    areaServed: {
      '@type': 'AdministrativeArea',
      name: 'Loudoun County, Virginia',
    },
    knowsAbout: [
      'Environmental conservation',
      'Stream and watershed restoration',
      'Water quality monitoring',
      'Habitat restoration',
      'Youth environmental education',
      'Community cleanups',
    ],
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

/** The website entity, published by the organization. */
export function websiteNode() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: ORG_NAME,
    alternateName: ORG_SHORT_NAME,
    description:
      'Student-led environmental conservation across Loudoun County, Virginia.',
    publisher: { '@id': ORG_ID },
    inLanguage: 'en-US',
  };
}

interface WebPageOptions {
  canonical: string;
  title: string;
  description: string;
  /** Set for research articles so the page is typed as an article container. */
  isArticle?: boolean;
  datePublished?: string;
  primaryImage?: string;
  breadcrumbId?: string;
}

/** The per-page entity, tying this URL back to the site and organization. */
export function webPageNode({
  canonical,
  title,
  description,
  isArticle,
  datePublished,
  primaryImage,
  breadcrumbId,
}: WebPageOptions) {
  return {
    '@type': isArticle ? 'ItemPage' : 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: title,
    description,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORG_ID },
    inLanguage: 'en-US',
    ...(datePublished ? { datePublished } : {}),
    ...(primaryImage
      ? { primaryImageOfPage: { '@type': 'ImageObject', url: absoluteUrl(primaryImage) } }
      : {}),
    ...(breadcrumbId ? { breadcrumb: { '@id': breadcrumbId } } : {}),
  };
}

/**
 * Build a BreadcrumbList from a trail of [name, path] pairs.
 * Google uses this to render the breadcrumb line in place of a raw URL.
 */
export function breadcrumbNode(
  canonical: string,
  trail: Array<[name: string, path: string]>,
) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${canonical}#breadcrumb`,
    itemListElement: trail.map(([name, path], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: absoluteUrl(path),
    })),
  };
}

/**
 * Merge page-specific nodes with the site-wide entities into one graph.
 * Strips any per-node `@context`, which is only valid at the document root.
 */
export function buildGraph(nodes: object[]) {
  const graph = nodes.filter(Boolean).map((node) => {
    const { '@context': _context, ...rest } = node as Record<string, unknown>;
    return rest;
  });
  return { '@context': 'https://schema.org', '@graph': graph };
}
