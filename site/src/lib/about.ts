/**
 * The "What we do" programs: listed on /about/, as the home page pillars, and in
 * llms-full.txt, from this one source so every surface describes the same
 * programs in the same words, including when the Keystatic list is empty.
 */
import reader from './reader';

const DEFAULT_WHAT_WE_DO = [
  {
    heading: 'Community Cleanups',
    body: 'We organize regular cleanups across Loudoun County parks, trails, and waterways. From neighborhood streams to county-wide events, our volunteers work hands-on to restore natural spaces.',
  },
  {
    heading: 'Student Research',
    body: 'Our research division conducts original environmental science studies - investigating water quality, dissolved oxygen, nutrient runoff, and ecosystem health - and publishes findings for public access.',
  },
  {
    heading: 'Education & Outreach',
    body: 'We empower the next generation of conservation leaders through school chapters, workshops, and community engagement events that connect students to the natural world around them.',
  },
  {
    heading: 'Policy & Advocacy',
    body: 'By partnering with local parks, schools, and organizations, we amplify our impact and help shape environmental stewardship culture across Northern Virginia.',
  },
];

export async function getWhatWeDo() {
  const about = await reader.singletons.about.read();
  return about?.whatWeDo?.length ? about.whatWeDo : DEFAULT_WHAT_WE_DO;
}
