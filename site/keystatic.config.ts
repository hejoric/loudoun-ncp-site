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
          description:
            'The LNCP branch this member belongs to. Doubles as their school: the branch record supplies the school name and logo for the badge on their card, so a branch member never needs to upload a school logo here.',
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
        headshotScale: fields.text({
          label: 'Headshot zoom (e.g. "0.9" to zoom out a little, "1.1" to zoom in) - leave blank for 1',
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
        affiliations: fields.array(
          fields.object({
            name: fields.text({
              label: 'School Name (e.g. "University of Virginia")',
              validation: { isRequired: true, length: { min: 1 } },
            }),
            logo: fields.image({
              label: 'Logo (transparent PNG/SVG preferred)',
              directory: 'public/assets/affiliations',
              publicPath: '/assets/affiliations/',
              validation: { isRequired: false },
            }),
          }),
          {
            label: 'Additional Affiliations (college, other school)',
            description:
              'Optional, and shown in this order after the branch school. Add an entry here when a member has a second school to show - e.g. a branch president who has been accepted to college keeps their high school badge (from their branch) and gains a college one. An entry with no logo yet still has its name printed under the card.',
            itemLabel: (props) => props.fields.name.value || 'Affiliation',
          }
        ),
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
        seoDescription: fields.text({
          label:
            'SEO meta description (optional, max ~160 chars) - falls back to the abstract. Set this when two papers share a similar abstract opening, so their search results stay distinct.',
          multiline: true,
          validation: { isRequired: false, length: { min: 0 } },
        }),
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
        spotlightVideoId: fields.text({
          label: 'Spotlight YouTube Video ID',
          description:
            'Just the ID from the YouTube URL (the part after "watch?v=" or "youtu.be/"), e.g. dQw4w9WgXcQ. Powers the featured video in the Spotlight section. Leave blank to fall back to a thumbnail that links to the article.',
          validation: { isRequired: false, length: { min: 0 } },
        }),
        spotlightVideoTitle: fields.text({
          label: 'Spotlight Video Title',
          validation: { isRequired: false, length: { min: 0 } },
        }),
        spotlightVideoSource: fields.text({
          label: 'Spotlight Video Source Label (e.g. WUSA9)',
          validation: { isRequired: false, length: { min: 0 } },
        }),
        spotlightVideoUrl: fields.url({
          label: 'Spotlight Video Fallback / Article URL (opened if no video ID is set)',
          validation: { isRequired: false },
        }),
        spotlightItems: fields.array(
          fields.object({
            label: fields.text({ label: 'Eyebrow Label (e.g. Award, Recognition)' }),
            title: fields.text({ label: 'Title' }),
            body: fields.text({ label: 'Body', multiline: true }),
            linkText: fields.text({ label: 'Link Text', validation: { isRequired: false, length: { min: 0 } } }),
            linkUrl: fields.text({ label: 'Link URL', validation: { isRequired: false, length: { min: 0 } } }),
            secondaryLinkText: fields.text({ label: 'Second Link Text (optional)', validation: { isRequired: false, length: { min: 0 } } }),
            secondaryLinkUrl: fields.text({ label: 'Second Link URL (optional)', validation: { isRequired: false, length: { min: 0 } } }),
          }),
          {
            label: 'Spotlight Items',
            itemLabel: (props) => props.fields.title.value || 'Spotlight Item',
          }
        ),
        // Order is editorial, not chronological: the FIRST entry is the story
        // featured with its photo on the homepage and at the top of /press/.
        // Everything after it renders as a wordmark in the homepage strip and a
        // row on /press/. Only `publication`, `headline`, and `url` are needed
        // for a plain entry - the rest exist so a story worth featuring can
        // carry its own art and credit line.
        pressLinks: fields.array(
          fields.object({
            publication: fields.text({ label: 'Publication Name' }),
            headline: fields.text({ label: 'Article Headline' }),
            url: fields.url({ label: 'Article URL' }),
            date: fields.date({
              label: 'Publication Date',
              validation: { isRequired: false },
            }),
            byline: fields.text({
              label: 'Byline (reporter name)',
              validation: { isRequired: false, length: { min: 0 } },
            }),
            summary: fields.text({
              label: 'Summary (shown on /press/, and on the homepage when featured)',
              multiline: true,
              validation: { isRequired: false, length: { min: 0 } },
            }),
            quote: fields.text({
              label: 'Pull quote (verbatim from the article, no quote marks)',
              multiline: true,
              validation: { isRequired: false, length: { min: 0 } },
            }),
            quoteAttribution: fields.text({
              label: 'Pull quote attribution (who said it, and their title)',
              validation: { isRequired: false, length: { min: 0 } },
            }),
            // Lands in src/assets, not public/, so astro:assets optimizes it
            // at build time - resized srcset plus a modern format - instead of
            // shipping whatever the outlet happened to send. src/lib/press.ts
            // maps the stored path back to the imported asset.
            image: fields.image({
              label: 'Article photo (landscape, min 1200px wide)',
              directory: 'src/assets/press',
              publicPath: '/src/assets/press/',
              validation: { isRequired: false },
            }),
            imageAlt: fields.text({
              label: 'Photo alt text',
              validation: { isRequired: false, length: { min: 0 } },
            }),
            imageCredit: fields.text({
              label: 'Photo credit (required if the outlet supplied the photo)',
              validation: { isRequired: false, length: { min: 0 } },
            }),
          }),
          {
            label: 'Press Links (first entry is the featured story)',
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
