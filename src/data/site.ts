/**
 * Site-wide settings. This is the one file to edit for social links,
 * the logo and the Country of the Week.
 */
export const site = {
  name: 'Passport Stories',
  tagline: 'Same planet. Different lives.',
  description:
    'Take a one-minute flight around a 3D globe, then explore how people in 20 countries work, study, marry, eat, live and commute, compared with India.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://passport-stories.vercel.app',

  /** Swap to '/logo.png' once the real badge is in /public. */
  logo: '/logo.svg',

  social: {
    instagram: 'https://www.instagram.com/passport.stories_195',
    youtube: 'https://www.youtube.com/@Passport.stories_195-g6q',
    handle: '@passport.stories_195',
  },

  /** Formspree form ID for Ask the Map (set NEXT_PUBLIC_FORMSPREE_ID). */
  formspreeId: process.env.NEXT_PUBLIC_FORMSPREE_ID || '',

  /**
   * Country of the Week. Leave null to rotate automatically through all
   * countries by calendar week, or set a slug (e.g. 'japan') to pin one.
   */
  countryOfTheWeek: null as string | null,

  /** Shown on the About page. Replace with the real team. */
  team: 'A small student team curious about how the rest of the world spends an ordinary Tuesday.',
};

/**
 * The main menu: four pages plus the home flight. `purpose` is the one line
 * shown under each page's title and in the phone menu, so a first-time
 * visitor always knows what a page is for.
 */
export const NAV = [
  { href: '/', label: 'Home', purpose: 'Real places from around the world, the globe and the latest reels.' },
  { href: '/countries', label: 'Countries', purpose: 'One country, six topics: work, school, weddings, food, housing and transport.' },
  { href: '/compare', label: 'Compare', purpose: 'Two countries, side by side, on all six topics.' },
  { href: '/your-life', label: 'Your Life', purpose: 'Your salary, rent, hours and commute, moved to another country.' },
  { href: '/quiz', label: 'Play Zone', purpose: 'Three quick games: Clue Chase, Higher or Lower and Flag Run.' },
  { href: '/facts', label: 'Community', purpose: 'Facts sent in by visitors. Add one of your own.' },
];
