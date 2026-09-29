/**
 * Publications newest first, undated papers last. The research index, the home
 * page research band, and the llms.txt files all read through here so they list
 * the papers in the same order.
 */
import reader from './reader';

export async function getPublications() {
  return (await reader.collections.publications.all()).sort((a, b) => {
    if (!a.entry.date) return 1;
    if (!b.entry.date) return -1;
    return new Date(b.entry.date).getTime() - new Date(a.entry.date).getTime();
  });
}
