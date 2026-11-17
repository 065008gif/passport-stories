import type { Country } from '../types';
import { COUNTRY_SOURCES, DRAFT, s } from '../helpers';

const germany: Country = {
  slug: 'germany',
  name: 'Germany',
  isoNumeric: '276',
  flag: '🇩🇪',
  airport: 'FRA',
  region: 'Europe',
  tagline: 'Where "after work" is an actual time of day.',
  geo: { lat: 51, lng: 10 },
  quickFacts: { population: 'About 84 million', capital: 'Berlin', currency: 'Euro (€)', language: 'German' },
  metrics: {
    workHours: s(34),
    paidLeave: s(20),
    schoolStartAge: s(6),
    schoolDayHours: s(5.5),
    weddingDays: s(1),
    weddingGuests: s(90),
    dinnerTime: s(18.5),
    householdSize: s(2),
    homeOwnership: s(47),
    commuteMinutes: s(30),
    publicTransportShare: s(15),
  },
  life: {
    currencyCode: 'EUR',
    currencySymbol: '€',
    perINR: s(0.0108),
    costIndex: s(270),
    rentShare: s(27),
    weekend: 'Fresh rolls from the bakery on Saturday, a long walk in the woods on Sunday, and every shop firmly shut.',
  },
  topics: {
    'work-life-balance': {
      headline: 'Work hard, then actually stop.',
      summary:
        'Germans work some of the shortest hours in the developed world and guard their free time. The end of the working day has its own word, Feierabend, and holidays are taken in full.',
      story: [
        'The working day tends to start early and finish early. Meetings begin on time, small talk is brief, and efficiency during office hours is what earns respect, not staying late. Once the day ends it really ends: contacting a colleague in the evening or on holiday is widely seen as poor manners.',
        'The legal minimum is 20 days of paid leave for a five-day week, and most contracts offer closer to 30. People book two or three weeks off in a row without apology, and an out-of-office reply that says "I will not be reading emails" is taken at face value. Sunday is protected too: most shops stay closed.',
      ],
      highlights: [
        'Around 30 days of annual leave is common in practice.',
        'Evenings and weekends are treated as private time.',
        'Most shops are closed on Sundays by law.',
      ],
      vsIndia: 'A working week that is over ten hours shorter, and roughly double the paid leave, which people are expected to use.',
      sources: DRAFT,
    },
    'school-day': {
      headline: 'A cone of sweets on day one, and home by lunchtime.',
      summary:
        'School traditionally starts around 8 am and, for younger children, ends around midday. There are no uniforms, and a first-grader\'s first day is celebrated with a large decorated cone full of treats.',
      story: [
        'The Schultüte is a cardboard cone, sometimes nearly as tall as the child, packed with sweets and school supplies and handed over on the very first day. It turns a nervous morning into a party with photos and grandparents.',
        'After primary school, usually four years, children are guided into different types of secondary school, a decision that arrives earlier than in most countries. The traditional half-day means afternoons are for homework, sports clubs and music, though all-day schools are becoming more common as more parents work full-time.',
      ],
      highlights: [
        'No school uniforms.',
        'Many children walk or cycle to school on their own from an early age.',
        'Students are streamed into different secondary school tracks around age 10.',
      ],
      vsIndia: 'No uniform, no morning assembly, and a shorter day. The choice of school track comes years before Indian students face board exams.',
      sources: DRAFT,
    },
    weddings: {
      headline: 'Smash the crockery, then saw a log.',
      summary:
        'The legally binding wedding is a short civil ceremony at the registry office; a church service or party may follow. Celebrations are usually one day, with a modest guest list and playful traditions.',
      story: [
        'Only the civil ceremony at the Standesamt counts in law, so every couple has one, often with just close family. The bigger celebration can be the same day or weeks later. The evening before, friends may gather for a Polterabend and smash old porcelain, which the couple sweeps up together for luck.',
        'After the ceremony some couples saw through a log with a two-handed saw, their first joint task. Friends organise games and sketches at the reception, and the dancing can run until sunrise. Couples commonly pay for much of the wedding themselves, sometimes with help from both sets of parents.',
      ],
      highlights: [
        'A registry office ceremony is required for the marriage to be legal.',
        'Guest lists are often under a hundred.',
        'Breaking porcelain before the wedding is meant to bring luck.',
      ],
      vsIndia: 'One day rather than several, and a guest list a quarter of the size. The couple, not the parents, usually run the show.',
      sources: DRAFT,
    },
    food: {
      headline: 'Bread for breakfast. Bread for dinner too.',
      summary:
        'The main hot meal is traditionally lunch, while dinner is often Abendbrot: bread with cheese, cold cuts and pickles, eaten early. Germany takes its bakeries and its afternoon coffee and cake seriously.',
      story: [
        'There are hundreds of recognised bread varieties, and the neighbourhood bakery is a daily stop. Many workplaces have a canteen where colleagues eat a warm lunch together, greeting each other with "Mahlzeit". That is why the evening meal at home can be simple and cold.',
        'On weekends, Kaffee und Kuchen in the mid-afternoon is a small ritual of its own. Tap water is rarely served in restaurants; sparkling water is the default. And the country\'s favourite street food is arguably the döner kebab, popularised by Turkish immigrants in Berlin.',
      ],
      highlights: [
        'Dinner is commonly eaten around 6 to 7 pm.',
        'A cold bread-based evening meal is a long-standing habit.',
        'Shops close on Sunday, so the weekly food shop happens on Saturday.',
      ],
      mustTry: 'A warm soft pretzel with butter, or a döner kebab from a busy corner shop.',
      vsIndia: 'Dinner happens two to three hours earlier and is often not cooked at all. The idea of a cold evening meal surprises most Indian visitors.',
      sources: DRAFT,
    },
    housing: {
      headline: 'A nation of tenants, and proud of it.',
      summary:
        'Germany has one of the lowest home-ownership rates in Europe: renting for decades is normal and well protected. Young adults typically move out around the time they start university or training.',
      story: [
        'Renting is not a waiting room for buying. Tenancies are long, rules favour tenants, and many families rent the same flat for twenty years. Flats often come without a fitted kitchen, so people bring their own, cabinets and all, when they move.',
        'Students and young workers commonly share a flat, a WG, with housemates chosen through something close to a job interview. Buildings have house rules, including quiet hours at night and on Sundays, and recycling is sorted into several coloured bins.',
      ],
      highlights: [
        'Roughly half of households rent their home.',
        'Flat-shares are the standard start to adult life.',
        'Quiet hours on Sundays and at night are taken seriously.',
      ],
      vsIndia: 'Renting for life is ordinary here, where most Indian families aim to own. Households are less than half the size, and moving out at 19 is expected.',
      sources: DRAFT,
    },
    transport: {
      headline: 'One ticket for every local train in the country.',
      summary:
        'Many Germans drive, but cities run on trams, U-Bahn and S-Bahn trains and bicycles. A single monthly pass, the Deutschlandticket, covers local and regional public transport nationwide.',
      story: [
        'Ticket checks on city transport work on trust: there are usually no barriers, just occasional inspectors. Cycling is everyday transport rather than sport, with marked lanes that pedestrians learn quickly not to stand in.',
        'The country is also the home of the Autobahn, with famous stretches that have no general speed limit. Long-distance trains connect the big cities, though their punctuality is a national talking point.',
      ],
      highlights: [
        'A flat-rate monthly pass covers regional transport across the country.',
        'Most city stations have no ticket barriers.',
        'Parts of the Autobahn have no general speed limit.',
      ],
      vsIndia: 'A shorter average commute and far more of it by car or bicycle. Two-wheelers here are pedal-powered.',
      sources: DRAFT,
    },
  },
  facts: [
    'German first-graders get a giant cone of sweets, the Schultüte, on their first day of school.',
    'Most German shops are closed on Sundays, a rule protected by law.',
    'Many German rental flats come without a kitchen; tenants bring their own.',
  ],
  quizClues: [
    'Children get a giant cone of sweets on their very first day of school.',
    'Most shops stay closed on Sundays.',
    'Its motorways have famous stretches with no general speed limit.',
  ],
  sources: COUNTRY_SOURCES,
  isRich: true,
};

export default germany;
