/**
 * Branches the site should show right now.
 *
 * A branch that is not running this year is marked `hidden` in Keystatic rather
 * than deleted, so its record (school name, logo, accent color) is still there
 * when it comes back. Every surface that lists branches or badges a member with
 * their branch school reads through here, so a hidden branch disappears from
 * all of them at once instead of lingering on whichever page forgot the filter.
 */
import reader from './reader';

export async function getBranches() {
  return (await reader.collections.branches.all()).filter((b) => !b.entry.hidden);
}
