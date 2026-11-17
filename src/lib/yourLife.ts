/**
 * The maths behind "Your Life in Another Country".
 * Pure functions only, so the numbers are easy to check and to unit test.
 */
import type { Country } from '@/data/types';

/** The slice of a country the calculator needs (kept small for the browser). */
export type LifeCountry = Pick<Country, 'slug' | 'name' | 'flag' | 'airport' | 'life' | 'metrics'>;

export interface LifeInputs {
  /** Monthly salary in rupees */
  salary: number;
  /** Monthly rent in rupees */
  rent: number;
  /** Hours worked per week */
  hours: number;
  /** Total commute per day, both ways, in minutes */
  commute: number;
  city: string;
}

export interface LifeResult {
  country: LifeCountry;
  /** Monthly pay needed there to keep the same standard of living, in local currency. */
  matchedSalary: number;
  /** Today's salary converted at the exchange rate, with no cost adjustment. */
  convertedSalary: number;
  rentShareNow: number;
  rentShareThere: number;
  hoursNow: number;
  hoursThere: number;
  /** Positive = more free hours per year there. */
  freeHoursPerYear: number;
  holidaysNow: number;
  holidaysThere: number;
  commuteNow: number;
  commuteThere: number;
  weekend: string;
  /** True when any figure used is still a sample value. */
  usesSampleData: boolean;
}

const WORK_WEEKS = 48;

/** `home` is the baseline country the visitor lives in now (India). */
export function computeLife(input: LifeInputs, country: LifeCountry, home: LifeCountry): LifeResult {
  const { life, metrics } = country;
  const costRatio = life.costIndex.value / home.life.costIndex.value;
  const commuteThere = metrics.commuteMinutes.value * 2;
  const weeklyGain = input.hours - metrics.workHours.value + ((input.commute - commuteThere) * 5) / 60;

  return {
    country,
    matchedSalary: input.salary * costRatio * life.perINR.value,
    convertedSalary: input.salary * life.perINR.value,
    rentShareNow: input.salary > 0 ? (input.rent / input.salary) * 100 : 0,
    rentShareThere: life.rentShare.value,
    hoursNow: input.hours,
    hoursThere: metrics.workHours.value,
    freeHoursPerYear: Math.round(weeklyGain * WORK_WEEKS),
    holidaysNow: home.metrics.paidLeave.value,
    holidaysThere: metrics.paidLeave.value,
    commuteNow: input.commute,
    commuteThere,
    weekend: life.weekend,
    usesSampleData: [life.costIndex, life.perINR, life.rentShare, metrics.workHours, metrics.paidLeave, metrics.commuteMinutes].some((x) => x.isSample),
  };
}

/** Formats an amount in a foreign currency, rounded to the nearest ten. */
export function money(amount: number, symbol: string) {
  const rounded = amount >= 1000 ? Math.round(amount / 10) * 10 : Math.round(amount);
  return `${symbol}${rounded.toLocaleString('en-US')}`;
}

export const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const STORE = 'ps_life_inputs';

export function loadInputs(): LifeInputs | null {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? (JSON.parse(raw) as LifeInputs) : null;
  } catch {
    return null;
  }
}

export function saveInputs(i: LifeInputs) {
  try {
    localStorage.setItem(STORE, JSON.stringify(i));
  } catch {
    /* ignore */
  }
}
