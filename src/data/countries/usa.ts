import type { Country } from '../types';
import { COUNTRY_SOURCES, s, topic } from '../helpers';

const usa: Country = {
  slug: 'usa',
  name: 'USA',
  isoNumeric: '840',
  flag: '🇺🇸',
  airport: 'JFK',
  region: 'Americas',
  tagline: 'Big roads, big portions, and a yellow bus at the corner.',
  geo: { lat: 39, lng: -98 },
  quickFacts: { population: 'About 335 million', capital: 'Washington, D.C.', currency: 'US dollar ($)', language: 'English' },
  metrics: {
    workHours: s(38), paidLeave: s(0), schoolStartAge: s(6), schoolDayHours: s(6.5),
    weddingDays: s(1), weddingGuests: s(115), dinnerTime: s(18.5), householdSize: s(2.5),
    homeOwnership: s(66), commuteMinutes: s(27), publicTransportShare: s(4),
  },
  life: {
    currencyCode: 'USD', currencySymbol: '$', perINR: s(0.0115), costIndex: s(310), rentShare: s(30),
    weekend: 'Saturday errands by car, a backyard barbecue with the neighbours, and a game on TV all Sunday.',
  },
  topics: {
    'work-life-balance': topic(
      'No legal minimum for paid holidays.',
      'The US has no national law requiring paid annual leave; time off depends on the employer, and around ten days is typical. Lunch is often eaten at the desk.',
      ['Changing jobs frequently is normal.', 'Thanksgiving in November is the big family holiday.'],
      'Fewer hours than India, but paid leave is not guaranteed by law at all.',
    ),
    'school-day': topic(
      'Yellow buses, lockers and Friday night football.',
      'Students ride yellow school buses, keep books in hallway lockers and usually wear their own clothes. Sports teams, marching bands and prom are a large part of high school life.',
      ['Many schools begin the day with the Pledge of Allegiance.', 'Students move between classrooms for each subject.'],
      'No uniforms in most public schools, and extracurriculars carry real weight for college admission.',
    ),
    weddings: topic(
      'Bridesmaids, a registry and a first dance.',
      'A typical wedding is a one-day event with matching bridesmaids and groomsmen, a rehearsal dinner the night before, and a reception with a first dance. Couples list the gifts they want on a registry.',
      ['The couple increasingly pays for the wedding themselves.', 'Guests toss the bouquet and cut a tiered cake.'],
      'One day, around a hundred guests, and gifts chosen in advance by the couple.',
    ),
    food: topic(
      'Free refills and a tip on top.',
      'Portions are generous, drinks are refilled without asking, and tipping 15 to 20 percent in restaurants is expected. Dinner is early, and drive-through windows serve everything from coffee to pharmacies.',
      ['Leftovers go home in a box.', 'Brunch is a weekend ritual in cities.'],
      'Dinner is two to three hours earlier, and tipping is a far bigger part of the bill.',
      'A smash burger with fries at a roadside diner.',
    ),
    housing: topic(
      'A house, a yard, and out at eighteen.',
      'Many families live in detached suburban houses with a garage and garden. Leaving home at eighteen for college or work is a common expectation.',
      ['Home loans typically run for thirty years.', 'Sharing a flat with roommates is standard for young adults.'],
      'Much more space per person, and moving out young is a rite of passage rather than a rupture.',
    ),
    transport: topic(
      'The car is the default.',
      'Around three in four workers drive to work alone, and many suburbs have no pavements at all. New York is the big exception, with a subway that runs all night.',
      ['Teenagers can get a driving licence at sixteen in most states.', 'Long road trips are a favourite holiday.'],
      'A shorter commute, almost all of it in a car, with very few two-wheelers.',
    ),
  },
  facts: [
    'The United States has no national law guaranteeing paid annual leave.',
    'New York City\'s subway runs 24 hours a day.',
  ],
  quizClues: [
    'There is no national law guaranteeing paid annual leave.',
    'Couples publish a list of the wedding gifts they would like.',
    'Children ride to school on yellow buses.',
  ],
  sources: COUNTRY_SOURCES,
};

export default usa;
