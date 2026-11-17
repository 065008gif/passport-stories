import type { Country } from '../types';
import { COUNTRY_SOURCES, DRAFT, s } from '../helpers';

const india: Country = {
  slug: 'india',
  name: 'India',
  isoNumeric: '356',
  flag: '🇮🇳',
  airport: 'DEL',
  region: 'Asia',
  tagline: 'Home base. Loud, layered and always mid-conversation.',
  geo: { lat: 22, lng: 79 },
  quickFacts: { population: 'About 1.4 billion', capital: 'New Delhi', currency: 'Indian rupee (₹)', language: 'Hindi and English, plus 20 other official languages' },
  metrics: {
    workHours: s(47),
    paidLeave: s(15),
    schoolStartAge: s(6),
    schoolDayHours: s(6),
    weddingDays: s(3),
    weddingGuests: s(400),
    dinnerTime: s(21),
    householdSize: s(4.4),
    homeOwnership: s(85),
    commuteMinutes: s(45),
    publicTransportShare: s(30),
  },
  life: {
    currencyCode: 'INR',
    currencySymbol: '₹',
    perINR: s(1),
    costIndex: s(100),
    rentShare: s(25),
    weekend: 'A late breakfast, a family lunch that runs till four, and a cousin who "was just in the area".',
  },
  topics: {
    'work-life-balance': {
      headline: 'The six-day week is fading. The late evening is not.',
      summary:
        'Office hours are long and often stretch past the official finish, though a five-day week is now common in large companies. Festivals are the real holidays: the calendar is full of them.',
      story: [
        'In most big-city offices the day starts gently, somewhere between 9:30 and 10:30, and makes up for it at the other end. Leaving before the manager can feel awkward, so the last hour is often spent waiting rather than working. Chai breaks are a daily fixture and a lot of real decisions get made over them.',
        'Annual leave exists but is frequently saved, carried forward or encashed rather than taken in one long stretch. Time off tends to come in festival-shaped pieces instead: Diwali week, a wedding in the family, a long weekend around a national holiday. Switching off usually means going home, and home usually means more people.',
      ],
      highlights: [
        'Saturday working is still normal in many smaller firms, shops and government offices.',
        'Festival and wedding leave is understood without much explanation.',
        'Work messages on WhatsApp after hours are widely accepted.',
      ],
      vsIndia: 'This is the home baseline that every other country on the site is compared against.',
      sources: DRAFT,
    },
    'school-day': {
      headline: 'Assembly, uniform check, and a tiffin worth trading.',
      summary:
        'School usually starts early, around 7:30 or 8, with a morning assembly. Uniforms are near universal, lunch comes from home in a tiffin, and many students head to tuition after the last bell.',
      story: [
        'The day opens in the playground: rows by class, a prayer or pledge, the national anthem and sometimes the news read aloud by a nervous student. Then it is six or seven periods with a short break and a lunch break, during which the contents of every tiffin are inspected, compared and redistributed.',
        'Board exams in classes 10 and 12 shape the later years, and coaching classes after school are common, especially in cities. Sports day, annual day and the farewell party are the fixed points everyone remembers long after the syllabus is forgotten.',
      ],
      highlights: [
        'Most schools have a uniform, often with a different one for sports days.',
        'Lunch is typically home-cooked and carried in a steel or insulated tiffin.',
        'Evening tuition or coaching is routine for older students.',
      ],
      vsIndia: 'This is the home baseline. Pick another country to see how its school day differs.',
      sources: DRAFT,
    },
    weddings: {
      headline: 'Not a day. A season.',
      summary:
        'Weddings commonly run across several days with separate functions such as haldi, mehendi and sangeet before the ceremony itself. Guest lists run into the hundreds and both families are deeply involved.',
      story: [
        'Rituals differ enormously by region, religion and community, but the shape is familiar: a run of smaller functions building to the ceremony and a reception. Each has its own clothes, food and playlist. Relatives arrive days early and the house quietly turns into an event office.',
        'Traditionally the bride\'s family carried much of the cost, though splitting expenses between both families, and couples contributing themselves, is increasingly common in cities. Guests dress up: saris, lehengas, sherwanis and kurtas, in colour. White and black are usually left at home.',
      ],
      highlights: [
        'Multiple functions over two to five days are typical.',
        'Hundreds of guests is ordinary; the neighbours are assumed to be invited.',
        'Wedding dates often cluster in auspicious winter months.',
      ],
      vsIndia: 'This is the home baseline. Most other countries on the site celebrate in a single day.',
      sources: DRAFT,
    },
    food: {
      headline: 'Three meals, two chais, and dinner after nine.',
      summary:
        'Everyday food is home-cooked, built around roti or rice with dal, vegetables and pickle, and it changes completely every few hundred kilometres. Dinner is late and usually eaten together.',
      story: [
        'A typical weekday plate depends on where you are: roti-sabzi in the north, rice with sambar or fish curry further south and east, and a hundred variations in between. Many households are vegetarian, and many that are not still eat vegetarian on particular days of the week.',
        'Eating with the right hand is normal at home. Tea punctuates the day, street snacks fill the evening gap, and food delivery apps have become a weeknight habit in cities. Guests are fed first and refusing a second helping takes real determination.',
      ],
      highlights: [
        'Dinner around 9 pm or later is common in cities.',
        'Home-cooked lunch is carried to work and school.',
        'Regional cuisines differ as much as languages do.',
      ],
      mustTry: 'Masala dosa with coconut chutney and sambar, eaten hot off the tawa.',
      vsIndia: 'This is the home baseline. Many countries on the site eat dinner two to three hours earlier.',
      sources: DRAFT,
    },
    housing: {
      headline: 'Three generations, one address.',
      summary:
        'Living with parents into adulthood, and after marriage, is common and carries no stigma. Most families own their home; renting is mainly a big-city and migrant-worker reality.',
      story: [
        'The joint family is less universal than it was, but the idea behind it holds: children typically stay until work or marriage moves them, and ageing parents often live with a son or daughter. In cities this now happens in apartments inside gated societies with a shared park, a temple and a very active residents\' WhatsApp group.',
        'Renting in metros comes with its own customs, including sizeable security deposits and landlords with opinions about tenants. Domestic help for cooking or cleaning is common in middle-class households, which shapes how the day runs.',
      ],
      highlights: [
        'Adult children living with parents is the default, not the exception.',
        'Ownership is high overall; renting concentrates in large cities.',
        'Housing societies work like small neighbourhoods with their own rules.',
      ],
      vsIndia: 'This is the home baseline. Household size here is roughly double that of most European countries on the site.',
      sources: DRAFT,
    },
    transport: {
      headline: 'Metro, auto, scooter, and a share cab for the last mile.',
      summary:
        'Commutes mix modes: two-wheelers, buses, suburban trains, metros and auto-rickshaws. Journeys in big cities are long and traffic is part of every plan.',
      story: [
        'The scooter and motorbike are the workhorses of Indian commuting, carrying far more people than cars do. Mumbai\'s suburban trains move millions a day, and metro networks have spread quickly across cities in the last two decades, with women-only coaches on many lines.',
        'The last mile is where it gets inventive: auto-rickshaws, e-rickshaws, shared cabs and app-based bike taxis. Paying is increasingly done by scanning a QR code, even for a ten-rupee ride.',
      ],
      highlights: [
        'Two-wheelers far outnumber cars.',
        'Metro systems now run in many major cities.',
        'UPI payments by QR code are accepted almost everywhere.',
      ],
      vsIndia: 'This is the home baseline. Commutes here are among the longest on the site.',
      sources: DRAFT,
    },
  },
  facts: [
    'Mumbai\'s dabbawalas deliver around two hundred thousand home-cooked lunches a day using a colour code painted on each tiffin.',
    'India has more than twenty official languages, and banknotes carry the denomination in many of them.',
    'The Indian Railways network is one of the largest employers in the world.',
  ],
  quizClues: [
    'Home-cooked lunches are delivered to offices by a network that sorts them using painted colour codes.',
    'A wedding here usually means several functions spread over a few days.',
    'People pay for a cup of chai by scanning a QR code.',
  ],
  sources: COUNTRY_SOURCES,
  isRich: true,
};

export default india;
