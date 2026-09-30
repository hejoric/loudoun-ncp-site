/**
 * The "What we do" programs: listed on /about/, as the home page pillars, and in
 * llms-full.txt, from this one source so every surface describes the same
 * programs in the same words, including when the Keystatic list is empty.
 */
import reader from './reader';

const DEFAULT_WHAT_WE_DO = [
  {
    heading: 'Community Cleanups & Habitat Restoration',
    body: 'We organize regular cleanups across Loudoun County parks, trails, and waterways, from neighborhood streams to county-wide events. Beyond picking up litter, we remove invasive plants and help restore meadows and other native habitat, working alongside the parks and conservation groups that care for them year-round. Student-run branches at high schools and colleges bring this hands-on work to their own campuses and communities.',
  },
  {
    heading: 'Research & Education',
    body: 'Our research division conducts original environmental science studies - investigating water quality, dissolved oxygen, nutrient runoff, and ecosystem health - and publishes findings for public access. We share what we learn through school chapters, workshops, and community events that connect students to the natural world around them, empowering the next generation of conservation leaders.',
  },
  {
    heading: 'Outreach, Policy & Advocacy',
    body: 'We spread the message of conservation through communication and community engagement, and by partnering with local parks, schools, and organizations we amplify our impact. Together we help shape environmental stewardship culture across Northern Virginia, and every branch president recruits members and represents their community within the wider organization.',
  },
];

export async function getWhatWeDo() {
  const about = await reader.singletons.about.read();
  return about?.whatWeDo?.length ? about.whatWeDo : DEFAULT_WHAT_WE_DO;
}
