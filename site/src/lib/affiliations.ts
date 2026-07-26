/**
 * A member's schools, in the order they are shown on their card.
 *
 * A member can be affiliated with more than one school at once - most branch
 * presidents are seniors, so once they are accepted to college they have a high
 * school and a college to show. The high school side comes from their branch
 * record (single source of truth for school name, logo, and accent color), and
 * anything extra comes from the member's own `affiliations` list.
 */
export interface Affiliation {
  name: string;
  logo?: string;
  /** 'branch' entries are derived from the branch record, not the member file. */
  source: 'branch' | 'member';
}

type BranchRecord = {
  slug: string;
  entry: { name: string; school: string; schoolLogo?: string | null };
};

type MemberRecord = {
  entry: {
    branch?: string | null;
    affiliations?: readonly { name: string; logo?: string | null }[] | null;
  };
};

/**
 * Resolve a member's affiliations, branch school first.
 *
 * A branch slug with no matching branch record contributes nothing: without the
 * record there is no school name or logo to show, and printing the raw slug
 * ("potomac-falls") on a card would look like a bug.
 */
export function resolveAffiliations(member: MemberRecord, branches: readonly BranchRecord[]): Affiliation[] {
  const resolved: Affiliation[] = [];

  const branch = member.entry.branch
    ? branches.find((b) => b.slug === member.entry.branch) ?? null
    : null;
  if (branch) {
    resolved.push({
      name: branch.entry.school || branch.entry.name,
      logo: branch.entry.schoolLogo ?? undefined,
      source: 'branch',
    });
  }

  for (const a of member.entry.affiliations ?? []) {
    const name = a.name?.trim();
    if (!name) continue;
    resolved.push({ name, logo: a.logo ?? undefined, source: 'member' });
  }

  // An editor can name the same school both ways (branch record + a manual
  // entry); show it once.
  const seen = new Set<string>();
  return resolved.filter((a) => {
    const key = a.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * The school names printed under a member's name, e.g.
 * "Dominion High School - University of Virginia". A logo badge alone does not
 * tell a visitor which school it is.
 */
export function affiliationLabel(affiliations: readonly Affiliation[]): string | undefined {
  return affiliations.length > 0 ? affiliations.map((a) => a.name).join(' - ') : undefined;
}
