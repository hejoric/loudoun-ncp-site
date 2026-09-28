/**
 * Branches the site should show right now.
 *
 * A branch that is not running this year is marked `hidden` in Keystatic rather
 * than deleted, so its record (school name, logo, accent color) is still there
 * when it comes back. Every surface that lists branches, badges a member with
 * their branch school, or renders a branch president reads through here, so a
 * hidden branch disappears from all of them at once instead of lingering on
 * whichever page forgot the filter.
 */
import reader from './reader';

type BranchRecord = { slug: string; entry: { hidden?: boolean | null } };

export async function getBranches() {
  const all = await reader.collections.branches.all();
  return { all, active: all.filter((b) => !b.entry.hidden) };
}

/**
 * Whether a member belongs on the site. A branch president whose branch is
 * hidden does not: a president card for a branch that is not running would
 * advertise the branch anyway. Everyone else does, including a member of a
 * hidden branch who sits in another section - they only lose that school badge.
 */
export function isShownMember(
  member: { entry: { section: string; branch?: string | null } },
  branches: readonly BranchRecord[],
) {
  const { section, branch } = member.entry;
  if (section !== 'branchPresidents' || !branch) return true;
  return !branches.find((b) => b.slug === branch)?.entry.hidden;
}
