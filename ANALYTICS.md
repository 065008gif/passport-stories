# Analytics tracking plan

Passport Stories uses **Google Analytics 4**. This file documents every event the site sends, when it fires, and which parameters go with it.

## Setup

1. In GA4, create a Web data stream and copy the Measurement ID (`G-XXXXXXXXXX`).
2. Set `NEXT_PUBLIC_GA_ID` in `.env.local` (local) and in Vercel > Project > Settings > Environment Variables (production). Redeploy.
3. Open the site and check GA4 > Reports > Realtime.

With no ID set, nothing is sent to Google. Every event is printed to the browser console as `[analytics] event_name {params}` instead, which is the quickest way to check the plan while developing.

## Automatic tracking (no code per button)

`src/components/Analytics.tsx` listens once for the whole site, so every new button or section is measured without extra work.

| Event | Fires when | Parameters |
|---|---|---|
| `ui_click` | Any link or button is pressed | `label` (its text, or its `data-track` name), `element`, `href`, `section`, `page_path` |
| `scroll_depth` | The visitor passes 25, 50, 75 and 100 % of a page | `percent`, `page_path` |
| `page_time` | The visitor leaves a page | `seconds` (time the tab was actually visible), `max_scroll_percent`, `page_path` |
| `section_view` | A named section (`data-section="..."`) scrolls into view, once per page view | `section`, `page_path` |
| `guess_made` | A "guess first" card is answered | `metric`, `pair`, `guess`, `result` (`correct`, `wrong`, `skipped`) |
| `filter_used` | Countries page: a region or "Rank by" chip is chosen | `filter` (`region` or `sort`), `value` |
| `picker_used` | A country is chosen in the flag picker | `picker`, `country`, `how` (`click`, `keyboard`, `random`) |

To name a click yourself, add `data-track="my-name"` to the element. To measure a new block, add `data-section="my-block"` to it.

## Your own dashboard at /admin

Every event is also saved to the site's own back end and shown at `/admin` (password protected): visitors, sessions, time per page, scroll depth, returning visitors, bounce rate, top clicks, sources, devices and a funnel. Setup is in [BACKEND.md](./BACKEND.md). More events added with it: `quiz_started` (`mode`), `fact_submitted` (`country`, `length`), `map_toggled` (`view`); `quiz_completed` now carries `mode` and `level`.

## See events live, without Google

Add `?debug=1` to any address, for example `http://localhost:3000/countries?debug=1`. A small panel lists every event as it fires, with its parameters. It stays on while you browse; `?debug=0` turns it off. This works with no GA4 ID, so it is the quickest way to demonstrate the tracking plan.

## Where to look in Google Analytics 4

Menu names in GA4 move from time to time; these are the reports to look for.

| Question | Where |
|---|---|
| Who is on the site right now, and what are they pressing? | Reports > Realtime |
| Which pages are viewed most, and average engagement time per page | Reports > Engagement > Pages and screens |
| How often each event fires | Reports > Engagement > Events |
| Do visitors come back (retention, returning users) | Reports > Retention |
| Where visitors came from (Instagram, YouTube, WhatsApp) | Reports > Acquisition > Traffic acquisition |
| Funnels, e.g. home > country > Your Life > card downloaded | Explore > Funnel exploration |
| The path people take through the site | Explore > Path exploration |

GA4 measures engagement time and returning users by itself. To break reports down by the site's own parameters (`country`, `label`, `section`, `percent`, `metric`, `result`, `filter`, `value`, `placement`), register each one once under Admin > Custom definitions > Create custom dimension (scope: Event). `seconds` goes in as a custom metric. Standard reports take roughly a day to fill; Realtime is immediate.


**Where the code lives**

| File | Role |
|---|---|
| `src/lib/analytics.ts` | `track()`, page views, UTM capture. The only file that talks to GA. |
| `src/components/Analytics.tsx` | Loads gtag.js, captures UTMs, sends `page_view`, runs the automatic tracking and the `?debug=1` panel. |
| `src/components/Bits.tsx` | `<TrackEvent>` and `<CountryVisit>` helpers used by pages. |

## Custom events

| Event | Fires when | Parameters | Sent from |
|---|---|---|---|
| `country_view` | A country page is opened | `country` (slug) | `CountryVisit` in `Bits.tsx` |
| `topic_view` | A topic section of a country page reaches the middle of the screen (once per topic per visit) | `country`, `topic` | `TopicSpy` in `Bits.tsx` |
| `compare_run` | A comparison page is opened | `country_a`, `country_b`, `comparison_pair` (e.g. `india-vs-germany`) | `compare/[pair]/page.tsx` |
| `your_life_generated` | A Your Life result is generated, by the form or by "Try another country" | `country`, `work_hours`, `commute_minutes`, `salary_band`, `via` (`try_another` when applicable) | `YourLifeClient.tsx` |
| `share_card_downloaded` | A story card PNG is downloaded | `card_type` (`your_life` or `quiz`), `country` or `quiz_score` | `YourLifeClient.tsx`, `QuizClient.tsx` |
| `quiz_completed` | The fifth quiz round is finished | `quiz_score` (0 to 15), `max_score`, `correct_answers`, `best_streak` | `QuizClient.tsx` |
| `suggestion_submitted` | The Ask the Map form is submitted successfully | `suggestion_type` (`country` or `topic`), `suggestion` (first 60 characters), `delivered` (false in preview mode) | `AskForm.tsx` |
| `stamp_earned` | A country is visited for the first time in this browser | `country`, `stamps_total` | `lib/passport.ts` |
| `teleport_used` | "Teleport me" is pressed (Countries page, Passport) | `country` (the random pick) | `TeleportButton` in `Bits.tsx` |
| `pass_print_started` | "Print my boarding pass" is pressed (the printer animation starts) | `country` | `YourLifeClient.tsx` |
| `home_gate_click` | A gate in the home page "Your turn to take off" section is chosen | `gate` (`A1` to `A4`), `target` | `home/BoardingGates.tsx` |
| `globe_spun` | Someone grabs and spins the 3D globe | `where` (`hero` or `free_roam`) | `flight/FlightHome.tsx` |
| `outbound_social_click` | An Instagram or YouTube link is clicked | `platform`, `placement` (`footer` or `reels`) | `SocialLink` in `FooterClient.tsx` |

Two supporting events:

| Event | Fires when | Parameters |
|---|---|---|
| `page_view` | Every page load and client-side navigation | `page_path`, `page_location`, `page_title` |
| `search_used` | A search result is chosen | `search_term`, `result` (destination path) |
| `flight_completed` | The visitor reaches the last screen of the home page flight (once per visit) | none |

## UTM parameters

When a visitor lands with UTM tags (for example `?utm_source=instagram&utm_medium=bio&utm_campaign=launch`):

- GA4 reads them from the landing URL as usual for session attribution.
- The site also stores `utm_source`, `utm_medium`, `utm_campaign`, `utm_term` and `utm_content` in `sessionStorage` and attaches them to **every custom event** for the rest of the session, so you can break down `your_life_generated` or `quiz_completed` by campaign even after the URL has changed.
- Links leaving for Instagram and YouTube are tagged `utm_source=passportstories&utm_medium=website&utm_content=<placement>`.

Suggested link tags for social posts:

| Placement | Example |
|---|---|
| Instagram bio | `?utm_source=instagram&utm_medium=bio` |
| Instagram story sticker | `?utm_source=instagram&utm_medium=story&utm_campaign=<country>` |
| YouTube description | `?utm_source=youtube&utm_medium=description&utm_campaign=<video>` |
| WhatsApp share | `?utm_source=whatsapp&utm_medium=share` |

## GA4 configuration checklist

Custom parameters only appear in reports after they are registered. In GA4 > Admin > Custom definitions, create **event-scoped custom dimensions** for:

`country`, `topic`, `comparison_pair`, `card_type`, `salary_band`, `suggestion_type`, `platform`, `placement`

and **custom metrics** for: `quiz_score`, `stamps_total`.

Mark these as **key events** (conversions): `your_life_generated`, `share_card_downloaded`, `quiz_completed`, `suggestion_submitted`, `outbound_social_click`.

## Questions the plan can answer

| Question | How |
|---|---|
| Which countries pull the most interest? | `country_view` by `country` |
| Which topic is most read? | `topic_view` by `topic` |
| Do people finish the home page flight? | `flight_completed` divided by home `page_view` |
| Which comparisons do people run? | `compare_run` by `comparison_pair` |
| Does Instagram traffic use the signature feature? | `your_life_generated` filtered by `utm_source = instagram` |
| How shareable are the cards? | `share_card_downloaded` divided by `your_life_generated` + `quiz_completed` |
| Does the passport bring people back? | Returning users with `stamp_earned`, and the distribution of `stamps_total` |
| Does the site send people back to social? | `outbound_social_click` by `platform` and `placement` |

## Privacy notes

- Salary and rent are never sent. Only a broad `salary_band` (`under_25k`, `25k_50k`, `50k_100k`, `100k_200k`, `over_200k`) is recorded.
- Passport stamps and Your Life inputs stay in the visitor's browser (`localStorage`).
- If the site is promoted in regions that require consent for analytics cookies, add a consent banner before loading GA.

## Vercel Web Analytics and Speed Insights

Both are already in the code (`src/app/layout.tsx`). In the Vercel dashboard open the project, then **Analytics > Enable** and **Speed Insights > Enable**. Vercel Analytics gives privacy-friendly visitor counts with no cookie banner; Speed Insights shows real-world page speed (Core Web Vitals) per page.

## Export the raw events

Signed in at `/admin`, press **Export CSV** on the Analytics tab (or open `/api/admin/export?days=30`). One row per event with time, anonymous visitor and session IDs, event name, page, device, source and parameters, ready for Excel, Power BI or pandas.

## GA4 custom definitions (do this once)

GA4 only shows event parameters in reports after they are registered. In GA4: **Admin > Custom definitions > Create custom dimension**, scope **Event**, and add: `country`, `topic`, `comparison_pair`, `card_type`, `gate`, `where`, `mode`, `label`, `section`, `salary_band`, `platform`, `placement`. Add `quiz_score`, `seconds`, `percent` and `work_hours` as **custom metrics**. Then mark `your_life_generated`, `share_card_downloaded`, `fact_submitted` and `compare_run` as **Key events** (Admin > Events).
