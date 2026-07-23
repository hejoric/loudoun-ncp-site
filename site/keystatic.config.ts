import { config, fields, collection, singleton } from '@keystatic/core';

export default config({
  // Local mode: Keystatic reads/writes the YAML files in src/content directly.
  // The editor is only available during `npm run dev` at /keystatic - it is
  // never part of the deployed site.
  storage: { kind: 'local' },

  ui: {
    brand: { name: 'LNCP Admin' },
  },

  collections: {
    teamMembers: collection({
      label: 'Team Members',
      slugField: 'name',
      path: 'src/content/team/*',
      format: { data: 'yaml' },
      schema: {
        name: fields.slug({ name: { label: 'Full Name' } }),
        role: fields.text({ label: 'Role / Title' }),
        section: fields.select({
          label: 'Section',
          options: [
            { label: 'Executive', value: 'executive' },
            { label: 'Directors', value: 'directors' },
            { label: 'Executive Staff', value: 'executiveStaff' },
            { label: 'Branch Presidents', value: 'branchPresidents' },
            { label: 'Branch Staff', value: 'branchStaff' },
          ],
          defaultValue: 'branchStaff',
        }),
        branch: fields.text({
          label: 'Branch slug (e.g. potomac-falls) - leave blank if not a branch member',
          validation: { isRequired: false, length: { min: 0 } },
        }),
        bio: fields.text({ label: 'Bio', multiline: true }),
        headshot: fields.image({
          label: 'Headshot (square, min 800x800)',
          directory: 'public/assets/team',
          publicPath: '/assets/team/',
          validation: { isRequired: false },
        }),
        headshotPosition: fields.text({
          label: 'Headshot crop position (CSS object-position, e.g. "center 20%") - leave blank for top',
          validation: { isRequired: false, length: { min: 0 } },
        }),
        email: fields.text({
          label: 'Email',
          validation: { isRequired: false, length: { min: 0 } },
        }),
        instagram: fields.text({
          label: 'Instagram handle (without @)',
          validation: { isRequired: false, length: { min: 0 } },
        }),
        linkedin: fields.url({
          label: 'LinkedIn profile URL',
          validation: { isRequired: false },
        }),
        website: fields.url({
          label: 'Personal website URL',
          validation: { isRequired: false },
        }),
        featuredOnHome: fields.checkbox({
          label: 'Feature on Home Page',
          defaultValue: false,
        }),
        sortOrder: fields.integer({ label: 'Sort Order (lower = first)', defaultValue: 99 }),
      },
    }),

    branches: collection({
      label: 'Branches',
      slugField: 'name',
      path: 'src/content/branches/*',
      format: { data: 'yaml' },
      schema: {
        name: fields.slug({ name: { label: 'Branch Name (e.g. Potomac Falls)' } }),
        school: fields.text({ label: 'Full School Name' }),
        schoolLogo: fields.image({
          label: 'School Logo (transparent PNG/SVG preferred)',
          directory: 'public/assets/branches',
          publicPath: '/assets/branches/',
          validation: { isRequired: false },
        }),
        accentColor: fields.text({
          label: 'Badge accent color (hex, optional)',
          validation: { isRequired: false, length: { min: 0 } },
        }),
      },
    }),

    publications: collection({
      label: 'Research Publications',
      slugField: 'title',
      path: 'src/content/publications/*',
      format: { data: 'yaml' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        authors: fields.array(
          fields.text({ label: 'Author Name' }),
          { label: 'Authors', itemLabel: (props) => props.value || 'Author' }
        ),
        date: fields.date({ label: 'Publication Date' }),
        abstract: fields.text({ label: 'Abstract', multiline: true }),
        pdfFile: fields.file({
          label: 'PDF Upload',
          directory: 'public/research',
          publicPath: '/research/',
          validation: { isRequired: false },
        }),
        pdfLink: fields.url({
          label: 'External PDF Link (use this OR PDF Upload)',
          validation: { isRequired: false },
        }),
      },
    }),

    events: collection({
      label: 'Events',
      slugField: 'title',
      path: 'src/content/events/*',
      format: { data: 'yaml' },
      schema: {
        title: fields.slug({ name: { label: 'Event Title' } }),
        date: fields.date({ label: 'Date' }),
        location: fields.text({ label: 'Location' }),
        description: fields.text({ label: 'Description', multiline: true }),
        signupLink: fields.url({
          label: 'Sign-up / RSVP Link',
          validation: { isRequired: false },
        }),
      },
    }),
  },

  singletons: {
    home: singleton({
      label: 'Home Page',
      path: 'src/content/singletons/home',
      format: { data: 'yaml' },
      schema: {
        heroHeadline: fields.text({ label: 'Hero Headline' }),
        heroSubtext: fields.text({ label: 'Hero Sub-text', multiline: true }),
        founderQuote: fields.text({ label: 'Founder Quote (shown at bottom of hero video)', multiline: true, validation: { isRequired: false } }),
        statsAcresCleaned: fields.integer({ label: 'Acres Cleaned', defaultValue: 3122 }),
        statsMembers: fields.integer({ label: 'Members', defaultValue: 270 }),
        statsImpressions: fields.integer({ label: 'Social Impressions', defaultValue: 726022 }),
        statsPartners: fields.integer({ label: 'Partner Parks & Schools', defaultValue: 17 }),
        missionHeading: fields.text({ label: 'Mission Section Heading' }),
        missionBody: fields.text({ label: 'Mission Section Body', multiline: true }),
        pressLinks: fields.array(
          fields.object({
            publication: fields.text({ label: 'Publication Name' }),
            headline: fields.text({ label: 'Article Headline' }),
            url: fields.url({ label: 'Article URL' }),
          }),
          {
            label: 'Press Links',
            itemLabel: (props) => props.fields.publication.value || 'Press Link',
          }
        ),
      },
    }),

    about: singleton({
      label: 'About Page',
      path: 'src/content/singletons/about',
      format: { data: 'yaml' },
      schema: {
        metaDescription: fields.text({ label: 'SEO Meta Description', multiline: true }),
        mission: fields.text({ label: 'Mission Statement', multiline: true }),
        whatWeDo: fields.array(
          fields.object({
            heading: fields.text({ label: 'Section Heading' }),
            body: fields.text({ label: 'Body Text', multiline: true }),
          }),
          { label: 'What We Do Sections', itemLabel: (props) => props.fields.heading.value || 'Section' }
        ),
        impactStats: fields.array(
          fields.object({
            value: fields.text({ label: 'Value (e.g. 3,122)' }),
            label: fields.text({ label: 'Label (e.g. Acres Cleaned)' }),
          }),
          { label: 'Impact Stats', itemLabel: (props) => props.fields.label.value || 'Stat' }
        ),
        historyTimeline: fields.array(
          fields.object({
            year: fields.text({ label: 'Year / Date' }),
            event: fields.text({ label: 'Event Description', multiline: true }),
          }),
          { label: 'History Timeline', itemLabel: (props) => props.fields.year.value || 'Event' }
        ),
      },
    }),

    siteSettings: singleton({
      label: 'Site Settings',
      path: 'src/content/singletons/settings',
      format: { data: 'yaml' },
      schema: {
        orgName: fields.text({ label: 'Organization Name', defaultValue: 'Loudoun Nature Conservation Project' }),
        tagline: fields.text({ label: 'Tagline', multiline: true }),
        contactEmail: fields.text({ label: 'Contact Email', defaultValue: 'directors@loudounnatureconservation.org' }),
        instagramUrl: fields.url({ label: 'Instagram URL', validation: { isRequired: false } }),
        linkedinUrl: fields.url({ label: 'LinkedIn URL', validation: { isRequired: false } }),
        linktreeUrl: fields.url({ label: 'Linktree URL', validation: { isRequired: false } }),
        volunteerFormUrl: fields.url({ label: 'Volunteer Google Form URL', validation: { isRequired: false } }),
      },
    }),
  },
});
