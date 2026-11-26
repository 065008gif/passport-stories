/**
 * Culture Map content (v9): everyday life, festivals, social customs and
 * lesser-known facts for the first five "deep" countries. Every item carries
 * a source so visitors can check it.
 *
 * Tone: a curious friend, not a textbook. Explain what is interesting, why it
 * exists, and what we can learn from it. No stereotypes, no "better or worse".
 */
import type { Source } from './types';

export type FactCategory = 'Traditions' | 'Food' | 'School & work' | 'Celebrations' | 'Everyday life';

export interface CultureItem {
  title: string;
  text: string;
  source: Source;
}

export interface CultureFact extends CultureItem {
  category: FactCategory;
}

export interface CultureProfile {
  slug: string;
  /** A curiosity-led question used as the section heading. */
  question: string;
  everyday: { text: string; source: Source };
  festivals: CultureItem[];
  customs: CultureItem[];
  facts: CultureFact[];
}

const W = (page: string, label = 'Wikipedia'): Source => ({ label, url: `https://en.wikipedia.org/wiki/${page}` });

export const CULTURE: CultureProfile[] = [
  {
    slug: 'india',
    question: 'What does an ordinary day in India sound, smell and taste like?',
    everyday: {
      text: 'Mornings often start with chai, and lunch for many office workers still comes from home. In Mumbai, a network of dabbawalas carries home-cooked tiffin boxes across the city by bicycle and local train, then brings the empty boxes back the same afternoon.',
      source: W('Dabbawala'),
    },
    festivals: [
      {
        title: 'Durga Puja, Kolkata',
        text: 'Each autumn, Kolkata fills with elaborate pandals (temporary art installations) for the goddess Durga. In 2021 UNESCO added Durga Puja in Kolkata to its list of the intangible cultural heritage of humanity.',
        source: { label: 'UNESCO', url: 'https://ich.unesco.org/en/RL/durga-puja-in-kolkata-00703' },
      },
      {
        title: 'Diwali',
        text: 'The festival of lights: lamps on doorsteps, rangoli patterns at the entrance, new clothes and sweets shared with neighbours. Dates follow the lunar calendar, usually October or November.',
        source: W('Diwali'),
      },
      {
        title: 'Holi',
        text: 'Spring arrives with coloured powder and water. For a day, streets become one big, friendly mess, and it is normal to get coloured by people you barely know.',
        source: W('Holi'),
      },
    ],
    customs: [
      { title: 'Namaste', text: 'Palms pressed together with a small nod is a respectful greeting that works for everyone, from elders to strangers.', source: W('Namaste') },
      { title: 'Shoes off at the door', text: 'Most homes and all temples expect shoes to be left at the entrance. It keeps the home clean and is a sign of respect.', source: W('Etiquette_in_India', 'Wikipedia: Etiquette in India') },
      { title: 'Touching elders’ feet', text: 'Bending to touch the feet of grandparents or teachers asks for their blessing. It is a gesture of respect, not of being lesser.', source: W('Etiquette_in_India', 'Wikipedia: Etiquette in India') },
    ],
    facts: [
      {
        category: 'Everyday life',
        title: 'Lunch delivered by the dabba army',
        text: 'Mumbai’s dabbawalas moved roughly 175,000 to 200,000 home-cooked lunch boxes a day before the pandemic, sorting them with a code of colours and numbers painted on the lids.',
        source: W('Dabbawala'),
      },
      {
        category: 'Celebrations',
        title: 'A festival on UNESCO’s heritage list',
        text: 'Durga Puja in Kolkata was inscribed on UNESCO’s Representative List of the Intangible Cultural Heritage of Humanity in December 2021.',
        source: { label: 'UNESCO', url: 'https://ich.unesco.org/en/RL/durga-puja-in-kolkata-00703' },
      },
    ],
  },
  {
    slug: 'japan',
    question: 'What makes a Japanese school day different?',
    everyday: {
      text: 'Many children walk to school in small groups, eat the same school lunch together in their classroom, and then spend part of the afternoon cleaning their school. Trains run to the minute, and shoes come off at the entrance of every home.',
      source: { label: 'Embassy of Japan in the USA', url: 'https://www.us.emb-japan.go.jp/itpr_en/education-system-in-japan.html' },
    },
    festivals: [
      {
        title: 'Shichi-Go-San',
        text: 'Around 15 November, families take children aged three, five and seven to a shrine to pray for healthy growth. Kids carry chitose-ame, long red-and-white “thousand-year candy” for a long life.',
        source: { label: 'Kids Web Japan', url: 'https://web-japan.org/kidsweb/explore/calendar/november/shichigosan.html' },
      },
      { title: 'Hanami', text: 'When the cherry trees bloom in spring, friends, families and whole offices picnic under the blossoms. Forecasts track the bloom as it moves north.', source: W('Hanami') },
      { title: 'Obon', text: 'In summer, families return to their hometowns to honour ancestors, with lanterns, visits to family graves and bon-odori dances in the evening.', source: W('Bon_Festival') },
    ],
    customs: [
      { title: 'The bow', text: 'A bow can mean hello, thank you or sorry. The deeper and longer the bow, the more respect or apology it shows.', source: W('Bowing') },
      { title: 'Shoes off in the genkan', text: 'Every home has a genkan, a small entrance step where outdoor shoes are left. Slippers are worn inside, and separate ones in the bathroom.', source: W('Genkan') },
      { title: 'No tipping', text: 'Good service is expected, not rewarded with extra cash. Leaving a tip can confuse staff, who may run after you to return it.', source: W('Gratuity', 'Wikipedia: Gratuity') },
    ],
    facts: [
      {
        category: 'School & work',
        title: 'Students clean their own schools',
        text: 'In almost all Japanese schools, children take turns cleaning classrooms, corridors and other areas. It is part of their education, not a punishment.',
        source: { label: 'MEXT (Japan’s education ministry)', url: 'https://www.eduport.mext.go.jp/pdf/summary/pamphlet/educa2017_pamphlet.pdf' },
      },
      {
        category: 'Food',
        title: 'Lunch is served by classmates',
        text: 'At many elementary schools, students on lunch duty wheel the food to their classroom and serve everyone, and the whole class eats the same meal together.',
        source: { label: 'Kids Web Japan', url: 'https://web-japan.org/kidsweb/cool/21/202101_on-duty-activity_en.html' },
      },
    ],
  },
  {
    slug: 'italy',
    question: 'Why is food such an important part of Italian family life?',
    everyday: {
      text: 'The day has a rhythm built around meals: a quick espresso standing at the bar, a long lunch, and in many towns an evening passeggiata, a slow stroll through the main street to see and be seen before dinner.',
      source: W('Passeggiata'),
    },
    festivals: [
      {
        title: 'Palio di Siena',
        text: 'Twice a year, on 2 July and 16 August, ten of Siena’s seventeen neighbourhoods race bareback horses around the town square. The rivalry lasts all year.',
        source: { label: 'Visit Tuscany', url: 'https://www.visittuscany.com/en/events/palio-di-siena/' },
      },
      { title: 'La Befana', text: 'On 6 January, a kind old woman on a broomstick brings sweets to good children and a lump of “coal” (often black sugar candy) to naughty ones.', source: W('Befana') },
      { title: 'Ferragosto', text: 'On 15 August much of Italy goes on holiday at once. Cities quieten and beaches and mountains fill with families.', source: W('Ferragosto') },
    ],
    customs: [
      { title: 'Two kisses hello', text: 'Friends and family often greet with a light kiss on each cheek. A handshake is the norm with people you have just met.', source: W('Cheek_kissing') },
      { title: 'Cappuccino is for the morning', text: 'Milky coffee is a breakfast drink. After a meal, most Italians order a short espresso instead.', source: W('Cappuccino') },
      { title: 'Fare la scarpetta', text: 'Mopping up the last of the sauce with a piece of bread is called “making the little shoe”. At home it is a compliment to the cook.', source: W('Italian_cuisine') },
    ],
    facts: [
      {
        category: 'Food',
        title: 'A diet on UNESCO’s list',
        text: 'The Mediterranean diet, shared by Italy, Spain, Greece and Morocco, was added to UNESCO’s intangible heritage list in 2010, for the way food is grown, shared and eaten together.',
        source: { label: 'UNESCO', url: 'https://ich.unesco.org/en/video/4614' },
      },
      {
        category: 'Celebrations',
        title: 'A horse can win without its rider',
        text: 'In the Palio di Siena, a horse that crosses the line first wins for its neighbourhood even if the jockey has fallen off.',
        source: W('Palio_di_Siena'),
      },
    ],
  },
  {
    slug: 'finland',
    question: 'How does a quiet country turn a hot room into a way of life?',
    everyday: {
      text: 'Sauna is part of the week, not a luxury. There are about 3.3 million saunas for 5.5 million people, in homes, apartment blocks, offices and lakeside cottages. Silence in conversation is comfortable, not awkward.',
      source: { label: 'UNESCO', url: 'https://ich.unesco.org/en/RL/sauna-culture-in-finland-01596' },
    },
    festivals: [
      {
        title: 'Juhannus (Midsummer)',
        text: 'Around the summer solstice the sun barely sets. Cities empty as people head to cottages by the lake for bonfires, sauna and a midnight swim.',
        source: { label: 'Visit Finland', url: 'https://www.visitfinland.com/articles/traditional-finnish-celebrations-and-parties' },
      },
      {
        title: 'Vappu (May Day)',
        text: 'Spring’s biggest party. Students, and anyone who ever graduated from upper secondary school, put on their white student caps and picnic in the park, whatever the weather.',
        source: { label: 'Visit Finland', url: 'https://www.visitfinland.com/articles/traditional-finnish-celebrations-and-parties' },
      },
      { title: 'Ystävänpäivä', text: '14 February is “Friend’s Day” in Finland. Cards and small gifts go to friends, not only to partners.', source: { label: 'Visit Finland', url: 'https://www.visitfinland.com/articles/traditional-finnish-celebrations-and-parties' } },
    ],
    customs: [
      { title: 'Comfortable silence', text: 'Pauses in conversation are normal and polite. People say what they mean and do not fill every gap with small talk.', source: W('Culture_of_Finland') },
      { title: 'Löyly', text: 'The burst of steam when water is thrown on the hot sauna stones has its own word, löyly, often described as the spirit of the sauna.', source: { label: 'UNESCO', url: 'https://ich.unesco.org/en/RL/sauna-culture-in-finland-01596' } },
      { title: 'Punctual by default', text: 'Being on time, for meetings and for dinner with friends, is a basic sign of respect.', source: W('Culture_of_Finland') },
    ],
    facts: [
      {
        category: 'School & work',
        title: 'Free school lunch since 1948',
        text: 'In 1948 Finland became the first country to serve a free school meal to every pupil, nationwide. It is now part of the national curriculum.',
        source: { label: 'Finnish Food Authority', url: 'https://www.ruokavirasto.fi/globalassets/teemat/terveytta-edistava-ruokavalio/ravitsemus--ja-ruokasuositukset/eng/school_meals_in_finland.pdf' },
      },
      {
        category: 'Traditions',
        title: 'More saunas than cars?',
        text: 'Finland has around 3.3 million saunas for 5.5 million people. Sauna culture was added to UNESCO’s intangible heritage list in 2020.',
        source: { label: 'UNESCO', url: 'https://ich.unesco.org/en/RL/sauna-culture-in-finland-01596' },
      },
    ],
  },
  {
    slug: 'singapore',
    question: 'How do four cultures share one small island, and one lunch table?',
    everyday: {
      text: 'Most people live in public housing estates built by the Housing and Development Board, and many eat out at hawker centres: open-air food courts where Chinese, Malay, Indian and Peranakan dishes sit side by side and a meal costs a few dollars.',
      source: { label: 'National Heritage Board', url: 'https://www.nhb.gov.sg/what-we-do/our-work/sector-development/unesco/hawker-culture-in-singapore' },
    },
    festivals: [
      { title: 'Chinese New Year', text: 'Families gather for a reunion dinner, toss yusheng (a raw-fish salad) high for good luck, and give red packets of money to children.', source: W('Chinese_New_Year') },
      { title: 'Hari Raya Puasa', text: 'At the end of Ramadan, Malay families open their homes to visitors, serve ketupat and rendang, and ask forgiveness from elders.', source: W('Eid_al-Fitr') },
      { title: 'Deepavali', text: 'Little India lights up with arches and lamps. Like Chinese New Year and Hari Raya, it is a public holiday for everyone.', source: W('Diwali') },
    ],
    customs: [
      { title: 'Chope-ing a seat', text: 'A packet of tissues on a hawker-centre table means “this seat is taken” while someone queues for food. Everyone knows the rule.', source: W('Singlish') },
      { title: 'Two hands', text: 'Business cards, gifts and even payment are often offered with both hands as a small sign of respect.', source: W('Culture_of_Singapore') },
      { title: 'Uncle and auntie', text: 'Older strangers, like the hawker frying your noodles, are politely called “uncle” or “auntie”.', source: W('Singlish') },
    ],
    facts: [
      {
        category: 'Food',
        title: 'A lunch culture with UNESCO status',
        text: 'Hawker culture became Singapore’s first entry on UNESCO’s intangible heritage list in December 2020.',
        source: { label: 'National Environment Agency', url: 'https://www.nea.gov.sg/media/news/news/index/hawker-culture-is-singapore-s-first-inscription-on-unesco-s-representative-list-of-the-intangible-cultural-heritage-of-humanity' },
      },
      {
        category: 'Everyday life',
        title: 'You can chew gum, but you cannot buy it',
        text: 'Selling and importing chewing gum has been banned since 1992, partly after gum jammed the doors of the new metro. Chewing it is not illegal.',
        source: W('Chewing_gum_sales_ban_in_Singapore'),
      },
      {
        category: 'Everyday life',
        title: 'Most people live in public housing',
        text: 'About three in four Singapore residents live in flats built by the Housing and Development Board, and most of them own their flat.',
        source: { label: 'HDB Key Statistics', url: 'https://www.hdb.gov.sg/-/media/hdb-pulse/reports/annual-reports-and-financial-statements/HDB-KeyStats-2026.pdf' },
      },
    ],
  },
];

export const getCulture = (slug: string) => CULTURE.find((c) => c.slug === slug);

/** Every "Did you know?" fact across the five deep countries, with its country. */
export const ALL_FACTS = CULTURE.flatMap((c) => [
  ...c.facts.map((f) => ({ ...f, country: c.slug })),
  ...c.customs.map((f) => ({ ...f, category: 'Traditions' as FactCategory, country: c.slug })),
  ...c.festivals.map((f) => ({ ...f, category: 'Celebrations' as FactCategory, country: c.slug })),
]);

export const FEATURED_SLUGS = CULTURE.map((c) => c.slug);
