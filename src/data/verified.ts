/**
 * Checked figures that replace the old sample values.
 *
 * Every number here comes from a named public source. Anything not listed
 * stays an editorial ESTIMATE and is labelled "est." on the site.
 *
 * Live figures (exchange rates, price levels, school starting age) are not
 * here: they are fetched from public APIs on every deploy by
 * scripts/fetch-live-data.mjs and stored in src/data/live.json.
 */
import type { MetricKey } from './types';

export interface Checked {
  value: number;
  source: string;
  url?: string;
}

const ILO = 'ILO modelled estimates, 2025 (average weekly hours actually worked per employed person, including part-time)';
const ILO_URL = 'https://ilostat.ilo.org/topics/working-time/';
const LEAVE = 'Statutory minimum paid annual leave, five-day week, first full year (national labour law)';
const LEAVE_URL = 'https://en.wikipedia.org/wiki/List_of_minimum_annual_leave_by_country';
const EUROSTAT_OWN = 'Eurostat EU-SILC 2024, share of population in owner-occupied homes';
const EUROSTAT_URL = 'https://ec.europa.eu/eurostat/databrowser/view/ilc_lvho02/default/table';

const hours = (value: number): Checked => ({ value, source: ILO, url: ILO_URL });
const leave = (value: number, note = ''): Checked => ({ value, source: note ? `${LEAVE}. ${note}` : LEAVE, url: LEAVE_URL });

export const VERIFIED: Record<string, Partial<Record<MetricKey, Checked>>> = {
  india: {
    workHours: hours(45.8),
    paidLeave: leave(18, 'Earned leave under state Shops and Establishments Acts; varies by state, casual leave extra'),
    householdSize: { value: 4.4, source: 'National Family Health Survey (NFHS-5), 2019–21', url: 'https://mohfw.gov.in/' },
    homeOwnership: { value: 86.6, source: 'Census of India 2011, households living in owned homes', url: 'https://censusindia.gov.in/' },
  },
  japan: {
    workHours: hours(31.0),
    paidLeave: leave(10, 'Rises with years of service, up to 20'),
    householdSize: { value: 2.21, source: 'Japan Population Census 2020 (via UN DESA Household Size database)', url: 'https://population.un.org/Household/index.html' },
    homeOwnership: { value: 60.9, source: 'Housing and Land Survey 2023, Statistics Bureau of Japan', url: 'https://www.stat.go.jp/english/data/jyutaku/' },
  },
  'south-korea': {
    workHours: hours(36.8),
    paidLeave: leave(15, 'Rises with years of service, up to 25'),
    householdSize: { value: 2.3, source: 'Population and Housing Census 2020, Statistics Korea', url: 'https://kostat.go.kr/' },
  },
  china: {
    workHours: hours(44.8),
    paidLeave: leave(5, 'After one year of work; 10 days after 10 years'),
    householdSize: { value: 2.62, source: 'Seventh National Population Census 2020', url: 'https://www.stats.gov.cn/' },
  },
  singapore: {
    workHours: hours(44.6),
    paidLeave: leave(7, 'Employment Act; rises by one day a year to 14'),
    householdSize: { value: 3.16, source: 'Census of Population 2020, Singapore Department of Statistics', url: 'https://www.singstat.gov.sg/' },
  },
  uae: {
    workHours: hours(48.4),
    paidLeave: leave(30, 'Calendar days after one year of service (Federal Decree-Law 33 of 2021)'),
  },
  germany: {
    workHours: hours(29.6),
    paidLeave: leave(20),
    householdSize: { value: 2.04, source: 'Microcensus 2022 (via UN DESA Household Size database)', url: 'https://population.un.org/Household/index.html' },
    homeOwnership: { value: 47.2, source: EUROSTAT_OWN, url: EUROSTAT_URL },
  },
  france: {
    workHours: hours(30.8),
    paidLeave: leave(25),
    householdSize: { value: 2.15, source: 'INSEE 2020 (via UN DESA Household Size database)', url: 'https://population.un.org/Household/index.html' },
    homeOwnership: { value: 61.2, source: EUROSTAT_OWN, url: EUROSTAT_URL },
  },
  italy: {
    workHours: hours(33.9),
    paidLeave: leave(20),
    homeOwnership: { value: 75.9, source: EUROSTAT_OWN, url: EUROSTAT_URL },
  },
  'united-kingdom': {
    workHours: hours(31.0),
    paidLeave: leave(28, '5.6 weeks; employers may count bank holidays towards it'),
    householdSize: { value: 2.36, source: 'ONS Families and Households 2023', url: 'https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/families' },
    homeOwnership: { value: 65, source: 'English Housing Survey 2023–24, owner-occupied households (England)', url: 'https://www.gov.uk/government/collections/english-housing-survey' },
  },
  netherlands: {
    workHours: hours(26.8),
    paidLeave: leave(20),
    homeOwnership: { value: 68.8, source: EUROSTAT_OWN, url: EUROSTAT_URL },
  },
  sweden: {
    workHours: hours(29.3),
    paidLeave: leave(25),
    householdSize: { value: 2.0, source: 'Eurostat 2023, average household size', url: 'https://ec.europa.eu/eurostat/web/interactive-publications/housing' },
    homeOwnership: { value: 64.8, source: EUROSTAT_OWN, url: EUROSTAT_URL },
  },
  finland: {
    workHours: hours(28.8),
    paidLeave: leave(25, '30 working days counted on a six-day week'),
    householdSize: { value: 1.96, source: 'Statistics Finland 2021 (via UN DESA Household Size database)', url: 'https://population.un.org/Household/index.html' },
    homeOwnership: { value: 68.1, source: EUROSTAT_OWN, url: EUROSTAT_URL },
  },
  usa: {
    workHours: hours(36.1),
    paidLeave: leave(0, 'No federal law requires paid vacation'),
    householdSize: { value: 2.51, source: 'US Census Bureau, America’s Families and Living Arrangements 2023', url: 'https://www.census.gov/topics/families/families-and-households.html' },
    homeOwnership: { value: 65, source: 'US Census Bureau, Housing Vacancies and Homeownership survey 2025', url: 'https://www.census.gov/housing/hvs/index.html' },
  },
  canada: {
    workHours: hours(32.3),
    paidLeave: leave(10, 'Two weeks in most provinces; rises with service'),
    householdSize: { value: 2.4, source: 'Statistics Canada, Census 2021', url: 'https://www12.statcan.gc.ca/census-recensement/index-eng.cfm' },
    homeOwnership: { value: 66.5, source: 'Statistics Canada, Census 2021', url: 'https://www12.statcan.gc.ca/census-recensement/index-eng.cfm' },
  },
  brazil: {
    workHours: hours(37.3),
    paidLeave: leave(22, '30 calendar days a year'),
    householdSize: { value: 2.79, source: 'IBGE Demographic Census 2022', url: 'https://www.ibge.gov.br/en/' },
  },
  mexico: {
    workHours: hours(42.1),
    paidLeave: leave(12, 'Since the 2023 reform; rises with service'),
    householdSize: { value: 3.6, source: 'INEGI Population and Housing Census 2020', url: 'https://www.inegi.org.mx/' },
  },
  australia: {
    workHours: hours(31.8),
    paidLeave: leave(20),
    householdSize: { value: 2.5, source: 'Australian Bureau of Statistics, Census 2021', url: 'https://www.abs.gov.au/census' },
    homeOwnership: { value: 66, source: 'Australian Bureau of Statistics, Census 2021', url: 'https://www.abs.gov.au/census' },
  },
  'south-africa': {
    workHours: hours(42.2),
    paidLeave: leave(15, '21 consecutive days, equal to 15 working days'),
  },
  egypt: {
    workHours: hours(45.6),
    paidLeave: leave(21, 'Rises to 30 after 10 years or at age 50'),
    householdSize: { value: 4.13, source: 'Egypt DHS 2014 (via UN DESA Household Size database)', url: 'https://population.un.org/Household/index.html' },
  },
};

/** Where the live figures come from (shown on the About page). */
export const LIVE_SOURCES = [
  { label: 'Exchange rates: ExchangeRate-API open access feed (updated daily)', url: 'https://www.exchangerate-api.com/docs/free' },
  { label: 'Price level ratio of PPP to market exchange rate (PA.NUS.PPPC.RF): World Bank Open Data API', url: 'https://data.worldbank.org/indicator/PA.NUS.PPPC.RF' },
  { label: 'Official entrance age to primary education (SE.PRM.AGES): UNESCO UIS via World Bank API', url: 'https://data.worldbank.org/indicator/SE.PRM.AGES' },
];
