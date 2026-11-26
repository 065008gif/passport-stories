/**
 * The Culture Journal: longer stories in six series. Each story explains what
 * makes a practice interesting, why it exists, and what we can learn from it.
 */
import type { Source } from './types';

export const SERIES = [
  { slug: 'beyond-borders', name: 'Beyond Borders', blurb: 'Lesser-known traditions around the world.' },
  { slug: 'a-day-in-their-life', name: 'A Day in Their Life', blurb: 'How an ordinary day looks in another country.' },
  { slug: 'food-without-borders', name: 'Food Without Borders', blurb: 'Food habits and eating traditions.' },
  { slug: 'the-way-we-work', name: 'The Way We Work', blurb: 'Workplace cultures around the world.' },
  { slug: 'childhood-around-the-world', name: 'Childhood Around the World', blurb: 'How children grow up in different countries.' },
  { slug: 'strange-but-true', name: 'Strange But True', blurb: 'Unusual cultural practices and facts.' },
] as const;

export type SeriesSlug = (typeof SERIES)[number]['slug'];

export interface Story {
  slug: string;
  series: SeriesSlug;
  title: string;
  dek: string;
  countries: string[];
  minutes: number;
  /** Paragraphs. A paragraph starting with "## " is a subheading. */
  body: string[];
  takeaway: string;
  sources: Source[];
  accent: string;
}

export const STORIES: Story[] = [
  {
    slug: 'why-japanese-students-clean-their-schools',
    series: 'childhood-around-the-world',
    title: 'Why do Japanese students clean their own schools?',
    dek: 'Mops, buckets and music on the speakers: the twenty minutes after lunch that teach more than any lesson.',
    countries: ['japan', 'india'],
    minutes: 3,
    accent: '#FF4F7B',
    body: [
      'Walk into a Japanese elementary school just after lunch and you might hear cheerful music on the speakers while children sweep corridors, wipe windows and push damp cloths along the classroom floor. This is o-soji, cleaning time, and almost every school in the country sets time aside for it.',
      '## It starts with lunch',
      'At many schools there is no canteen. Students on lunch duty put on white coats and caps, wheel the food to their classroom and serve their classmates. Everyone eats the same meal at their desks, often with the teacher. Afterwards the same children clear up.',
      '## Why do it?',
      'The point is not to save money on cleaners. Schools still employ staff for maintenance and deep cleaning. The idea is that a shared space is everyone’s responsibility. Children who scrub a floor are less likely to scuff it, and working in small groups teaches cooperation without a single lecture.',
      '## What about India?',
      'Many Indian schools have their own version: monitors, class duties, and the classroom you helped decorate for an annual function. The difference in Japan is that it is built into the timetable every day, for every child.',
    ],
    takeaway: 'Responsibility can be taught by doing, not just by telling. Twenty minutes a day adds up to a habit.',
    sources: [
      { label: 'Embassy of Japan in the USA: Education system', url: 'https://www.us.emb-japan.go.jp/itpr_en/education-system-in-japan.html' },
      { label: 'Kids Web Japan: Classroom duties', url: 'https://web-japan.org/kidsweb/cool/21/202101_on-duty-activity_en.html' },
      { label: 'MEXT: Japanese education pamphlet', url: 'https://www.eduport.mext.go.jp/pdf/summary/pamphlet/educa2017_pamphlet.pdf' },
    ],
  },
  {
    slug: 'singapore-hawker-centres-community-dining-room',
    series: 'food-without-borders',
    title: 'Singapore’s hawker centres: a nation’s dining room',
    dek: 'Chicken rice, nasi lemak and prata at one table. How cheap street food became world heritage.',
    countries: ['singapore'],
    minutes: 3,
    accent: '#FFB703',
    body: [
      'In Singapore, lunch is often a short walk to the nearest hawker centre: a covered, open-air food court with dozens of small stalls. One sells Hainanese chicken rice, the next nasi lemak, the next roti prata or laksa. Office workers, students and grandparents share long tables.',
      '## From street carts to food courts',
      'Hawker centres grew out of street food sold from carts. As the city was rebuilt, stalls moved into purpose-built centres with running water and proper drainage, so the food stayed affordable while getting cleaner and safer.',
      '## Why UNESCO cared',
      'In December 2020, “Hawker culture in Singapore” became the country’s first entry on UNESCO’s list of the intangible cultural heritage of humanity. UNESCO described hawker centres as community dining rooms where people from different backgrounds meet over breakfast, lunch and dinner.',
      '## The unwritten rules',
      'Put a packet of tissues on a table and you have “choped” it, or reserved your seat. Call the cook “uncle” or “auntie”. Return your tray. Small habits like these turn a busy food court into a shared space.',
    ],
    takeaway: 'A city’s cheapest meals can also be its most important meeting place.',
    sources: [
      { label: 'UNESCO: Hawker culture in Singapore', url: 'https://ich.unesco.org/en/RL/hawker-culture-in-singapore-community-dining-and-culinary-practices-in-a-multicultural-urban-context-01568' },
      { label: 'National Heritage Board', url: 'https://www.nhb.gov.sg/what-we-do/our-work/sector-development/unesco/hawker-culture-in-singapore' },
      { label: 'National Environment Agency press release, 2020', url: 'https://www.nea.gov.sg/media/news/news/index/hawker-culture-is-singapore-s-first-inscription-on-unesco-s-representative-list-of-the-intangible-cultural-heritage-of-humanity' },
    ],
  },
  {
    slug: 'finland-sauna-church-of-nature',
    series: 'beyond-borders',
    title: '3.3 million saunas: why Finland sweats together',
    dek: 'In a country of 5.5 million people, the sauna is less a luxury than a living room.',
    countries: ['finland'],
    minutes: 3,
    accent: '#6C4CF5',
    body: [
      'Finland has roughly 3.3 million saunas for 5.5 million people. They are in houses, apartment blocks, offices and lakeside cottages. For most Finns, a weekly sauna is as ordinary as a weekly shop.',
      '## More than getting clean',
      'Traditionally the sauna was a near-sacred place, sometimes called a “church of nature”. People went there to wash, to rest, to talk honestly, and in the past even to wash loved ones for their last rites. Today it is where friends unwind, colleagues talk without titles, and families end a summer day.',
      '## Löyly',
      'The heart of it is löyly, the wave of steam that rises when water is thrown on the hot stones. There are electric saunas, wood-heated ones and smoky “savusauna”, and no single correct way to use them. A cold lake, or a roll in the snow, often comes next.',
      '## Heritage, officially',
      'In December 2020, sauna culture in Finland became the country’s first entry on UNESCO’s list of the intangible cultural heritage of humanity.',
    ],
    takeaway: 'Some of the most useful traditions are simply regular time set aside to slow down, together.',
    sources: [
      { label: 'UNESCO: Sauna culture in Finland', url: 'https://ich.unesco.org/en/RL/sauna-culture-in-finland-01596' },
      { label: 'Finnish Government press release, 2020', url: 'https://valtioneuvosto.fi/en/-/1410845/finland-s-sauna-culture-inscribed-on-unesco-intangible-cultural-heritage-list' },
      { label: 'UN Regional Information Centre', url: 'https://unric.org/en/finnish-sauna-added-to-unescos-cultural-heritage-list/' },
    ],
  },
];

export const getStory = (slug: string) => STORIES.find((s) => s.slug === slug);
export const seriesName = (slug: SeriesSlug) => SERIES.find((s) => s.slug === slug)!.name;
