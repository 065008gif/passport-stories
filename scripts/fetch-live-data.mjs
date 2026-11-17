/**
 * Pulls the live figures from public APIs and saves them to src/data/live.json.
 * Runs automatically before every build (npm "prebuild"), so each Vercel
 * deploy ships fresh numbers. If an API cannot be reached, the previous
 * values in live.json are kept, so a build never fails because of it.
 *
 *   - Exchange rates (1 INR in each currency): open.er-api.com, no key needed
 *   - Price level ratio (PA.NUS.PPPC.RF): World Bank API, gives the cost index
 *   - Official primary school entrance age (SE.PRM.AGES): World Bank / UNESCO UIS
 */
import { readFile, writeFile } from 'node:fs/promises';

const OUT = new URL('../src/data/live.json', import.meta.url);
const ISO3 = {
  india: 'IND', japan: 'JPN', 'south-korea': 'KOR', china: 'CHN', singapore: 'SGP', uae: 'ARE',
  germany: 'DEU', france: 'FRA', italy: 'ITA', 'united-kingdom': 'GBR', netherlands: 'NLD', sweden: 'SWE', finland: 'FIN',
  usa: 'USA', canada: 'CAN', brazil: 'BRA', mexico: 'MEX', australia: 'AUS', 'south-africa': 'ZAF', egypt: 'EGY',
};
const CURRENCY = {
  india: 'INR', japan: 'JPY', 'south-korea': 'KRW', china: 'CNY', singapore: 'SGD', uae: 'AED',
  germany: 'EUR', france: 'EUR', italy: 'EUR', 'united-kingdom': 'GBP', netherlands: 'EUR', sweden: 'SEK', finland: 'EUR',
  usa: 'USD', canada: 'CAD', brazil: 'BRL', mexico: 'MXN', australia: 'AUD', 'south-africa': 'ZAR', egypt: 'EGP',
};

const get = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'passport-stories-build' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

async function worldBank(indicator) {
  const codes = Object.values(ISO3).join(';');
  const [, rows] = await get(`https://api.worldbank.org/v2/country/${codes}/indicator/${indicator}?format=json&mrnev=1&per_page=100`);
  const bySlug = {};
  for (const [slug, iso] of Object.entries(ISO3)) {
    const r = (rows || []).find((x) => x.countryiso3code === iso && x.value != null);
    if (r) bySlug[slug] = { value: r.value, year: r.date };
  }
  return bySlug;
}

async function main() {
  let prev = { fetchedAt: null, fx: {}, fxDate: null, costIndex: {}, schoolAge: {} };
  try {
    prev = { ...prev, ...JSON.parse(await readFile(OUT, 'utf8')) };
  } catch {}
  const next = { ...prev };
  let changed = false;

  try {
    const fx = await get('https://open.er-api.com/v6/latest/INR');
    if (fx.result !== 'success') throw new Error('fx: ' + fx.result);
    next.fx = Object.fromEntries(Object.entries(CURRENCY).filter(([s]) => s !== 'india').map(([s, c]) => [s, fx.rates[c]]).filter(([, v]) => typeof v === 'number'));
    next.fxDate = fx.time_last_update_utc;
    changed = true;
    console.log(`[live-data] exchange rates: ${Object.keys(next.fx).length} currencies`);
  } catch (e) {
    console.warn('[live-data] exchange rates: kept previous values', e.message);
  }

  try {
    const pl = await worldBank('PA.NUS.PPPC.RF');
    const india = pl.india?.value;
    if (!india) throw new Error('no India price level');
    next.costIndex = Object.fromEntries(Object.entries(pl).map(([s, r]) => [s, { value: Math.round((r.value / india) * 100), year: r.year }]));
    changed = true;
    console.log(`[live-data] price levels: ${Object.keys(next.costIndex).length} countries`);
  } catch (e) {
    console.warn('[live-data] price levels: kept previous values', e.message);
  }

  try {
    const age = await worldBank('SE.PRM.AGES');
    next.schoolAge = age;
    changed = true;
    console.log(`[live-data] school entrance age: ${Object.keys(age).length} countries`);
  } catch (e) {
    console.warn('[live-data] school entrance age: kept previous values', e.message);
  }

  if (changed) next.fetchedAt = new Date().toISOString();
  await writeFile(OUT, JSON.stringify(next, null, 2) + '\n');
}

main().catch((e) => {
  console.warn('[live-data] skipped:', e.message);
});
