/**
 * /llms.txt - a concise, machine-readable map of the site for LLM crawlers
 * (see llmstxt.org).
 *
 * Generated from the content collections at build time rather than hand-written,
 * so adding a publication, branch, or team member in Keystatic keeps this file
 * correct with no extra step. The previous static public/llms.txt had already
 * drifted: it omitted /funding and /proof-of-corporation and listed no papers.
 */
import type { APIRoute } from 'astro';
import reader from '@/lib/reader';
import { getPressItems } from '@/lib/press';
import { ORG_EMAIL, SITE_URL } from '@/lib/seo';
import { getSocialLinks } from '@/lib/social';

const PAGES: Array<[string, string, string]> = [
  ['Home', '/', 'Mission, impact stats, awards, and recent press'],
  ['About', '/about/', 'Mission, programs, impact, and full founding timeline'],
  ['Research', '/research/', 'Index of student environmental science publications'],
  ['Team', '/team/', 'Executive team, directors, and school branch presidents'],
  ['Events', '/events/', 'Upcoming and past cleanups, restoration events, and workshops'],
  ['Press', '/press/', 'Every news story, broadcast, and public record covering LNCP'],
  ['Volunteer', '/volunteer/', 'How to join cleanups and conservation efforts'],
  ['Funding', '/funding/', 'How the nonprofit is funded and how to support it'],
  ['Contact', '/contact/', 'Partnerships, press, and general inquiries'],
  ['Proof of Corporation', '/proof-of-corporation/', '501(c)(3) incorporation documents and bylaws'],
];

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
  const pubs = (await reader.collections.publications.all()).sort((a, b) => {
    if (!a.entry.date) return 1;
    if (!b.entry.date) return -1;
    return new Date(b.entry.date).getTime() - new Date(a.entry.date).getTime();
  });

  const members = await reader.collections.teamMembers.all();
  const branches = await reader.collections.branches.all();
  // Same source the site links from, so a profile added or removed in Site
  // Settings shows up here too instead of leaving a stale URL behind.
  const socialLinks = await getSocialLinks();

  // Same normalized list the site renders, so this file cannot claim coverage
  // the pages don't show (or miss coverage they do).
  const press = await getPressItems();

  const leadership = members
    .filter((m) => m.entry.section === 'executive' || m.entry.section === 'directors')
    .sort((a, b) => (a.entry.sortOrder ?? 99) - (b.entry.sortOrder ?? 99));

  const lines: string[] = [];

  lines.push('# Loudoun Nature Conservation Project (LNCP)');
  lines.push('');
  lines.push(
    '> A student-led 501(c)(3) nonprofit empowering youth to restore nature, advance',
  );
  lines.push(
    '> sustainability, and foster community through environmental stewardship across',
  );
  lines.push('> Loudoun County, Virginia. Made by students, for students.');
  lines.push('');
  lines.push(
    'LNCP was incorporated in Virginia in April 2024 and organizes stream cleanups,',
  );
  lines.push(
    'ecological restoration events, and original student research on local water and',
  );
  lines.push(
    'habitat health. It operates through school- and college-based branches led by',
  );
  lines.push('student presidents, coordinated by an executive team and directors.');
  lines.push('');

  lines.push('## Key pages');
  for (const [name, path, desc] of PAGES) {
    lines.push(`- [${name}](${SITE_URL}${path}): ${desc}`);
  }
  lines.push('');

  lines.push('## Research publications');
  lines.push('');
  lines.push(
    'Original environmental science research by LNCP students. All are freely accessible.',
  );
  lines.push('');
  for (const pub of pubs) {
    lines.push(`- [${pub.entry.title}](${SITE_URL}/research/${pub.slug}/)`);
    lines.push(`  - Authors: ${pub.entry.authors.join(', ')}`);
    lines.push(`  - Published: ${formatDate(pub.entry.date)}`);
    const pdf = pub.entry.pdfFile ?? pub.entry.pdfLink;
    if (pdf) {
      lines.push(`  - PDF: ${pdf.startsWith('http') ? pdf : `${SITE_URL}${pdf}`}`);
    }
  }
  lines.push('');

  lines.push('## Leadership');
  for (const m of leadership) {
    lines.push(`- ${m.entry.name} - ${m.entry.role}`);
  }
  lines.push('');

  lines.push('## Branches');
  for (const b of branches) {
    lines.push(`- ${b.entry.name}${b.entry.school ? ` (${b.entry.school})` : ''}`);
  }
  lines.push('');

  lines.push('## Recognition');
  lines.push(
    '- Recognized in the United States Congressional Record by Representative Suhas Subramanyam (Virginia 10th District)',
  );
  lines.push(
    '- 2025 Environmental Excellence Award (Student), Loudoun County Environmental Commission - founder Ryan Nisay',
  );
  lines.push(
    '- 2025 Youth Leader, Faith Alliance for Climate Solutions Sustainability Champions Awards - founder Ryan Nisay',
  );
  lines.push('');

  if (press.length > 0) {
    lines.push('## Press coverage');
    lines.push('');
    lines.push('Third-party reporting on LNCP, for citation.');
    lines.push('');
    for (const p of press) {
      // formatDate() prints "undated" for a missing date, which is useful in a
      // publication list where every paper has one. Most press entries predate
      // the date field, so here an unknown date is simply omitted.
      const meta = [p.byline ? `by ${p.byline}` : null, p.date ? formatDate(p.date) : null]
        .filter(Boolean)
        .join(', ');
      lines.push(`- ${p.publication}: [${p.headline}](${p.url})${meta ? ` (${meta})` : ''}`);
    }
    lines.push('');
  }

  lines.push('## Facts');
  lines.push('- Type: 501(c)(3) nonprofit, student-led');
  lines.push('- Incorporated: April 2024, Commonwealth of Virginia');
  lines.push('- Founder: Ryan Nisay (co-founders Christian Shire and Carter Lepuil)');
  lines.push('- Location: Loudoun County, Virginia, USA');
  lines.push(
    '- Funding: community donations, grants, and partnerships with local parks and schools',
  );
  lines.push(
    '- First grant: $3,000 from MainStreet Bank in 2024, the first monetary support the organization received',
  );
  lines.push(`- Contact: ${ORG_EMAIL}`);
  for (const link of socialLinks) {
    lines.push(`- ${link.label}: ${link.href}`);
  }
  lines.push('');

  lines.push('## Optional');
  lines.push(
    `- [llms-full.txt](${SITE_URL}/llms-full.txt): Same map plus the full abstract of every publication`,
  );
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
