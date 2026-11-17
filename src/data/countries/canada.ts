import type { Country } from '../types';
import { COUNTRY_SOURCES, s, topic } from '../helpers';

const canada: Country = {
  slug: 'canada',
  name: 'Canada',
  isoNumeric: '124',
  flag: '🇨🇦',
  airport: 'YYZ',
  region: 'Americas',
  tagline: 'Two languages, six time zones, and an apology for bumping into you.',
  geo: { lat: 57, lng: -100 },
  quickFacts: { population: 'About 40 million', capital: 'Ottawa', currency: 'Canadian dollar (C$)', language: 'English and French' },
  metrics: {
    workHours: s(37), paidLeave: s(10), schoolStartAge: s(6), schoolDayHours: s(6),
    weddingDays: s(1), weddingGuests: s(130), dinnerTime: s(18.5), householdSize: s(2.4),
    homeOwnership: s(66), commuteMinutes: s(27), publicTransportShare: s(11),
  },
  life: {
    currencyCode: 'CAD', currencySymbol: 'C$', perINR: s(0.016), costIndex: s(270), rentShare: s(30),
    weekend: 'A coffee run, a morning at the rink or the lake depending on the month, and a potluck with friends from five countries.',
  },
  topics: {
    'work-life-balance': topic(
      'Two weeks to start, a year for a new baby.',
      'Paid vacation starts at two weeks in most provinces and grows with service. Parental leave is long: new parents can share up to a year or more away from work.',
      ['Summer Fridays and long weekends are treasured.', 'Remote work is common across long distances.'],
      'About ten fewer hours a week, with far longer parental leave.',
    ),
    'school-day': topic(
      'French immersion and snow days.',
      'Many children study in French immersion programmes even in English-speaking provinces. Yellow buses do the school run, and heavy snow can cancel school for the day.',
      ['No uniforms in most public schools.', 'Outdoor recess continues well below freezing.'],
      'No uniform and less exam pressure. Classrooms are highly multicultural.',
    ),
    weddings: topic(
      'Every tradition, sometimes in one weekend.',
      'Weddings reflect the country\'s mix of cultures, from church ceremonies to multi-day South Asian celebrations. A one-day event with dinner and dancing is the most common form.',
      ['In some provinces, couples host a fundraising party before the wedding.', 'Summer and early autumn are peak season.'],
      'Usually smaller and shorter, though Indo-Canadian weddings keep the full multi-day format.',
    ),
    food: topic(
      'Coffee in a paper cup, maple on everything.',
      'A stop at a coffee-and-doughnut chain is a daily habit for many. The food scene mirrors immigration, so butter chicken, pho and shawarma are as everyday as burgers.',
      ['Dinner is commonly eaten around 6 to 7 pm.', 'Canada produces most of the world\'s maple syrup.'],
      'Dinner is over two hours earlier. Indian groceries and restaurants are easy to find in big cities.',
      'Poutine: fries, cheese curds and hot gravy.',
    ),
    housing: topic(
      'A basement is a whole extra floor.',
      'Detached and semi-detached houses often include a finished basement, sometimes rented out. Housing costs in Toronto and Vancouver are a constant topic of conversation.',
      ['Central heating runs for half the year.', 'Students commonly rent shared houses.'],
      'Smaller households and much colder winters. Renting a basement flat is a familiar first step for newcomers.',
    ),
    transport: topic(
      'Long distances, and tunnels to dodge the cold.',
      'Most Canadians commute by car, while Toronto, Montreal and Vancouver have metros or light rail. Downtown Toronto and Montreal have underground walkway networks linking offices and stations.',
      ['Winter tyres are standard, and mandatory in Quebec.', 'Crossing the country by road takes about a week.'],
      'A shorter commute, mostly by car, with winter as the main obstacle rather than traffic.',
    ),
  },
  facts: [
    'Canada produces most of the world\'s maple syrup.',
    'Toronto has a network of underground walkways about 30 km long.',
  ],
  quizClues: [
    'School can be cancelled for a "snow day".',
    'Many children study in French immersion programmes.',
    'It produces most of the world\'s maple syrup.',
  ],
  sources: COUNTRY_SOURCES,
};

export default canada;
