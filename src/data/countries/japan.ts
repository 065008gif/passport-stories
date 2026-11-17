import type { Country } from '../types';
import { COUNTRY_SOURCES, DRAFT, s } from '../helpers';

const japan: Country = {
  slug: 'japan',
  name: 'Japan',
  isoNumeric: '392',
  flag: '🇯🇵',
  airport: 'NRT',
  region: 'Asia',
  tagline: 'Where the train apologises for being a minute late.',
  geo: { lat: 36, lng: 138 },
  quickFacts: { population: 'About 124 million', capital: 'Tokyo', currency: 'Japanese yen (¥)', language: 'Japanese' },
  metrics: {
    workHours: s(39),
    paidLeave: s(10),
    schoolStartAge: s(6),
    schoolDayHours: s(6.5),
    weddingDays: s(1),
    weddingGuests: s(60),
    dinnerTime: s(19),
    householdSize: s(2.3),
    homeOwnership: s(61),
    commuteMinutes: s(48),
    publicTransportShare: s(50),
  },
  life: {
    currencyCode: 'JPY',
    currencySymbol: '¥',
    perINR: s(1.8),
    costIndex: s(230),
    rentShare: s(28),
    weekend: 'A convenience-store breakfast, a day trip by train to somewhere with hot springs, and ramen on the way home.',
  },
  topics: {
    'work-life-balance': {
      headline: 'Long days, short holidays, and a slow change of heart.',
      summary:
        'Japan is known for long office hours and for workers who leave much of their paid leave unused. Reforms and a younger generation are pushing back, and public holidays do a lot of the resting for everyone.',
      story: [
        'Traditionally, staying late signalled commitment, and leaving before colleagues could feel like letting the team down. After-work drinks with the boss, called nomikai, blurred the line further. The country even has a word, karoshi, for death from overwork, which is exactly why the government has capped overtime and nudged companies to send people home.',
        'What Japan lacks in long personal holidays it makes up in shared ones. There are many national holidays, and Golden Week in spring and Obon in summer are when half the country travels at once. Things are shifting: remote work, "no overtime" days and younger workers who simply go home on time are all more visible than a decade ago.',
      ],
      highlights: [
        'Many employees use only part of their annual leave.',
        'Golden Week and Obon are the big shared breaks.',
        'After-work socialising with colleagues is part of office culture.',
      ],
      vsIndia: 'Both countries know the late evening at the office. Japan\'s recorded hours are shorter, but taking a long personal holiday is just as rare.',
      sources: DRAFT,
    },
    'school-day': {
      headline: 'Students serve the lunch and sweep the floor.',
      summary:
        'Children usually walk to school in groups, eat the same hot lunch in their classroom, and clean the school themselves at the end of the day. Clubs keep many students busy until evening.',
      story: [
        'There is typically no canteen queue. At lunchtime a few students put on white caps and aprons, wheel the food in and serve their classmates, and everyone eats the same meal together with the teacher. Afterwards comes o-soji: the whole school picks up brooms and cloths and cleans classrooms, corridors and even toilets.',
        'The school year starts in April, under the cherry blossoms. Uniforms are standard from junior high, indoor shoes are swapped at the entrance, and after-school clubs for sports, music or calligraphy are taken seriously. Many students also attend juku, private cram schools, in the evening.',
      ],
      highlights: [
        'Young children commonly travel to school without an adult.',
        'School lunch is planned by nutritionists and served by the students.',
        'Daily cleaning time is part of the timetable.',
      ],
      vsIndia: 'No tiffin here: everyone eats the same school lunch. Evening cram school will feel familiar to anyone who has done coaching classes.',
      sources: DRAFT,
    },
    weddings: {
      headline: 'One day, two outfits, and a precise guest list.',
      summary:
        'Weddings are usually a single, carefully timed day for a relatively small guest list. Many couples have a Shinto or Western-style ceremony followed by a seated reception.',
      story: [
        'A Shinto ceremony at a shrine involves a white kimono for the bride and the ritual sharing of sake in three sets of three sips. Chapel-style ceremonies in a white dress are just as popular, and plenty of brides change outfits during the reception, so guests see both.',
        'Guests bring goshugi, a gift of crisp new banknotes in a decorated envelope, and go home with a return gift chosen by the couple. The reception runs to the minute, with speeches, a slideshow and a letter read to the parents that reliably makes the room cry.',
      ],
      highlights: [
        'Guest lists are small by Indian standards, often well under a hundred.',
        'Cash gifts in special envelopes are the norm.',
        'The reception follows a tight, planned schedule.',
      ],
      vsIndia: 'A fraction of the guests and a single day instead of several. The cash envelope will feel familiar; the stopwatch will not.',
      sources: DRAFT,
    },
    food: {
      headline: 'Rice, soup, and something seasonal.',
      summary:
        'A classic home meal is rice, miso soup and a few small dishes. Convenience stores sell genuinely good food, slurping noodles is polite, and people say a short thanks before and after eating.',
      story: [
        'The traditional pattern is called ichiju-sansai: one soup, three dishes, plus rice. Fish, pickles and vegetables do most of the work, and what is on the plate changes with the season. Lunch is often a bento, either made at home or bought on the way.',
        'The konbini, the 24-hour convenience store, is a food institution: rice balls, hot snacks and full meals at any hour. Meals begin with "itadakimasu" and end with "gochisosama". Tipping is not expected, and eating while walking is generally avoided.',
      ],
      highlights: [
        'Dinner is commonly eaten around 7 pm.',
        'Bento boxes are a daily habit for workers and students.',
        'There is no tipping in restaurants.',
      ],
      mustTry: 'A bowl of ramen at a counter shop, ordered from a ticket machine by the door.',
      vsIndia: 'Dinner lands about two hours earlier, and the flavours are far milder. The packed lunch from home is a shared habit.',
      sources: DRAFT,
    },
    housing: {
      headline: 'Small footprint, everything in its place.',
      summary:
        'Homes are compact, especially in Tokyo, and shoes always come off at the door. Young adults often rent small apartments, and living alone is very common.',
      story: [
        'The entrance step, the genkan, marks the line between outside and inside, and outdoor shoes stay on the wrong side of it. Rooms are still sometimes measured in tatami mats. Space is used cleverly: futons that fold away, baths with a separate washing area, and kitchens where everything is within arm\'s reach.',
        'Renting has its own rituals, including "key money", a non-refundable gift to the landlord in some areas. Rubbish is sorted into many categories and collected on fixed days, and neighbours notice if you get it wrong.',
      ],
      highlights: [
        'One-person households are the most common type.',
        'Shoes off indoors is non-negotiable.',
        'Waste sorting rules are detailed and followed closely.',
      ],
      vsIndia: 'Households are about half the size, and living alone is ordinary rather than unusual. Space per person in Tokyo will feel tight even to someone from Mumbai.',
      sources: DRAFT,
    },
    transport: {
      headline: 'The train is the plan.',
      summary:
        'In the big cities almost everyone commutes by train, and the trains run to the second. Rush hour is crowded and silent, and employers typically pay for the commuter pass.',
      story: [
        'Tokyo\'s network is dense enough that owning a car is optional. Platforms have marked queueing lines, trains stop exactly where the marks say, and delays of a few minutes come with an apology and sometimes a printed certificate to show your boss. Inside, phones are on silent and conversations are short.',
        'Between cities, the Shinkansen bullet train has run since 1964 with average delays measured in seconds. Bicycles handle the trip to the station, and rechargeable IC cards work across trains, buses and vending machines.',
      ],
      highlights: [
        'Rail carries the majority of big-city commuters.',
        'Talking on the phone in a train carriage is frowned on.',
        'Companies usually reimburse commuting costs.',
      ],
      vsIndia: 'Commute times are similar to an Indian metro city, but nearly all of it is on rail, and the timetable is treated as a promise.',
      sources: DRAFT,
    },
  },
  facts: [
    'In Japanese schools, students clean their own classrooms, corridors and toilets every day.',
    'If a train is late, the railway company can hand out a delay certificate to show your employer.',
    'Japan has more than five million vending machines, selling everything from hot coffee to soup.',
  ],
  quizClues: [
    'Students here serve lunch to their classmates and then clean the school.',
    'Wedding guests give crisp banknotes in a decorated envelope.',
    'Bullet trains here have been running since 1964.',
  ],
  sources: COUNTRY_SOURCES,
  isRich: true,
};

export default japan;
