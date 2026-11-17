# Where the numbers come from

Every figure on the site is one of three kinds. The About page lists them all, country by country.

| Kind | What it means | Where it lives |
|---|---|---|
| **Live** | Pulled from a public API every time the site is built (each Vercel deploy) | `src/data/live.json`, written by `scripts/fetch-live-data.mjs` |
| **Checked** | Taken from a named official source, with the source shown on the site | `src/data/verified.ts` |
| **est.** | Editorial estimate where no comparable official statistic exists across countries; tagged "est." wherever it appears | the country files in `src/data/countries/` |

## Live (APIs, no key needed)

- Exchange rates, 1 INR in each currency: open.er-api.com (ExchangeRate-API open feed, daily)
- Cost of living index (India = 100): World Bank API, indicator `PA.NUS.PPPC.RF` (price level ratio of PPP conversion factor to market exchange rate)
- School starting age: World Bank API, indicator `SE.PRM.AGES` (UNESCO UIS official entrance age to primary)

`npm run build` runs the fetch first (`prebuild`). If an API is down, the last saved values are kept and the build carries on. To refresh the numbers without changing code, redeploy in Vercel (or add a Vercel Deploy Hook and call it from a weekly cron).

## Checked

- Work week: ILO modelled estimates 2025, average weekly hours actually worked per employed person (includes part-time workers, so it is lower than the contractual week in many countries)
- Paid holidays: statutory minimum in national labour law, five-day week, first full year
- Household size: national censuses and surveys, via the UN DESA Household Size and Composition database
- Home ownership: Eurostat EU-SILC 2024 for EU countries, national statistics offices elsewhere

## Still estimates

Wedding length and guests, dinner time, school day length, commute time, public transport share, rent as a share of pay, and a few household and ownership figures (China, UAE, South Africa, Brazil, Mexico, Egypt, South Korea, Singapore ownership). To upgrade one, add it to `src/data/verified.ts` with its source and URL; the "est." tag disappears automatically.
