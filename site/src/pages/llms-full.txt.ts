/**
 * /llms-full.txt - the expanded companion to /llms.txt.
 *
 * Includes each publication's complete abstract and the organization's mission
 * and history inline, so a model can answer substantive questions (and cite the
 * research accurately) from a single fetch instead of crawling five PDFs.
 */
import type { APIRoute } from 'astro';
import reader from '@/lib/reader';
import { ORG_ADDRESS_SHORT, ORG_EIN, ORG_EMAIL, SITE_URL } from '@/lib/seo';

function formatDate(date: string | null) {
  if (!date) return 'undated';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export const GET: APIRoute = async () => {
  const about = await reader.singletons.about.read();
  const pubs = (await reader.collections.publications.all()).sort((a, b) => {
    if (!a.entry.date) return 1;
    if (!b.entry.date) return -1;
    return new Date(b.entry.date).getTime() - new Date(a.entry.date).getTime();
  });

  const lines: string[] = [];

  lines.push('# Loudoun Nature Conservation Project (LNCP) - full reference');
  lines.push('');
  lines.push(
    '> A student-led 501(c)(3) nonprofit empowering youth to restore nature, advance',
  );
  lines.push(
    '> sustainability, and foster community through environmental stewardship across',
  );
  lines.push('> Loudoun County, Virginia.');
  lines.push('');
  lines.push(`Canonical site: ${SITE_URL}/`);
  lines.push(`Contact: ${ORG_EMAIL}`);
  lines.push(`Charity ID / EIN: ${ORG_EIN}`);
  lines.push(`Registered office: ${ORG_ADDRESS_SHORT}`);
  lines.push('');

  if (about?.mission) {
    lines.push('## Mission');
    lines.push('');
    lines.push(about.mission.trim());
    lines.push('');
  }

  if (about?.whatWeDo?.length) {
    lines.push('## What we do');
    lines.push('');
    for (const item of about.whatWeDo) {
      lines.push(`### ${item.heading}`);
      lines.push('');
      lines.push(item.body.trim());
      lines.push('');
    }
  }

  if (about?.historyTimeline?.length) {
    lines.push('## History');
    lines.push('');
    for (const entry of about.historyTimeline) {
      lines.push(`- ${entry.year}: ${entry.event.trim()}`);
    }
    lines.push('');
  }

  lines.push('## Research publications (full abstracts)');
  lines.push('');
  for (const pub of pubs) {
    lines.push(`### ${pub.entry.title}`);
    lines.push('');
    lines.push(`- URL: ${SITE_URL}/research/${pub.slug}/`);
    lines.push(`- Authors: ${pub.entry.authors.join(', ')}`);
    lines.push(`- Published: ${formatDate(pub.entry.date)}`);
    lines.push('- Publisher: Loudoun Nature Conservation Project (self-published)');
    const pdf = pub.entry.pdfFile ?? pub.entry.pdfLink;
    if (pdf) {
      lines.push(`- PDF: ${pdf.startsWith('http') ? pdf : `${SITE_URL}${pdf}`}`);
    }
    lines.push('');
    lines.push('Abstract:');
    lines.push('');
    lines.push(pub.entry.abstract.trim());
    lines.push('');
  }

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
