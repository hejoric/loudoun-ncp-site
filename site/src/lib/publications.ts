/**
 * Publications newest first, undated papers last. The research index, the home
 * page research band, and the llms.txt files all read through here so they list
 * the papers in the same order.
 */
import reader from './reader';
import { ORG_ID } from './seo';

export async function getPublications() {
  return (await reader.collections.publications.all()).sort((a, b) => {
    if (!a.entry.date) return 1;
    if (!b.entry.date) return -1;
    return new Date(b.entry.date).getTime() - new Date(a.entry.date).getTime();
  });
}

/**
 * JSON-LD publisher of a paper: its preprint server when it has one, LNCP
 * otherwise. The paper page and the research index both describe the same
 * article @id, so they must name the same publisher.
 */
export function publisherNode(pub: { preprintServer: string }) {
  return pub.preprintServer ? { '@type': 'Organization', name: pub.preprintServer } : { '@id': ORG_ID };
}
