# Passport Stories (v5)

**Same planet. Different lives.**

A website about how people in 20 countries live everyday life: work, school, weddings, food, housing and transport, each compared with India.

The home page is a one-minute flight around a 3D Earth. A paper plane takes off from Delhi and each scroll flick flies it to the next stop (Tokyo, New York, São Paulo, Frankfurt, Helsinki), with one surprising fact and one number at each. On the last screen the globe moves to the centre and is handed over: it turns slowly, spins with your drag (and keeps momentum), every country pops up as a flag you can tap, and "Surprise me" spins it to a random one.

Travelling to a country plays a short flight (a paper plane flying an arc from DEL to the destination), and the first time you land anywhere a passport page appears, gets stamped, and flies into the passport counter in the header.

Built with Next.js (App Router), TypeScript, Tailwind CSS, three.js and Framer Motion. It deploys on Vercel's free plan and uses no paid services or APIs.

> **Read this first: the numbers are sample data.**
> Every statistic on the site (working hours, paid leave, cost-of-living index, exchange rates and so on) is a **sample value** marked `isSample: true` in the data files and tagged "sample" in the interface. They are realistic placeholders, not verified facts. Replace them with World Bank, OECD and cost-of-living data before quoting them anywhere. The written copy is an editorial draft and should also be reviewed. India, Japan and Germany have full-length copy; the other 17 countries have complete but shorter entries.

## The pages

| Page | Route | What it is for |
|---|---|---|
| Home | `/` | The flight: seven screens, one flick each, ending in a globe you can spin and tap |
| Countries | `/countries`, `/countries/japan` | One country, six topics, each with a "Compared with India" box |
| Compare | `/compare/india-vs-germany` | Two countries side by side. `/compare` opens India vs Japan |
| Your Life | `/your-life`, `/your-life/germany` | Your salary, rent, hours and commute, moved abroad. Boarding-pass result and a 1080x1920 story card |
| Quiz | `/quiz` | Three clues, guess the country. Shareable score card |

Smaller pages, linked from the footer and header: Your Passport (`/passport`, stamps and badges kept in the browser), Ask the Map (`/ask`, Formspree form), About and Sources (`/about`).

**What was removed, and where it went.** Explore Map and Theme Tours are no longer separate pages; the home page's globe and flight do those jobs. Topic pages such as `/countries/japan/school-day` were merged into the country page and old links redirect to the matching section.

Also included: fuzzy search from anywhere (Ctrl/Cmd + K or `/`), "Teleport me", "Did you know?" cards, breadcrumbs with structured data, Open Graph images, sitemap, optional stamp sound (off by default) and one hidden badge.

## How the home page works

- The text is ordinary HTML in `src/app/page.tsx`: a hero, one screen per stop, and the "your turn" screen.
- `src/components/flight/FlightHome.tsx` pins the 3D scene behind it. Progress along the route is simply the scroll position divided by the screen height, so the plane is always exactly where the scroll says.
- One mouse-wheel notch, arrow key or swipe moves exactly one screen. After the last screen the page scrolls normally.
- The flight tracker at the bottom shows the route with flags and jumps to any stop.
- `src/components/FlightProvider.tsx` is the "Flying to ..." page change; `src/components/StampToast.tsx` is the passport stamp on arrival.
- `src/components/flight/world.ts` is the three.js scene: the Earth (NASA day and night images blended by a small shader), atmosphere, stars, a light per country, the trail and the paper plane.
- **Change the route** in `src/data/flight.ts`: each stop is a country, a city name and the metric to show. Keep it to five or six stops. The fact shown is the first entry in that country's `facts`.

## New in v7 (draft)

- Dark inner pages: indigo-to-plum gradient cards with a thin accent line, sunset headings, no red and no pink. Big inner-page headings use Bowlby One.
- The whole site is drawn at 90 % on laptops; bigger top bar; reading-progress line with a small airplane.
- Countries: colour-chip filters that wrap (no scrollbar); the moving flag ribbon is gone.
- Play Zone: no timers. Clue Chase gives clues on request with a points ladder, Higher or Lower has 5 lives, Flag Run is ten flags.
- Your Life: check-in desk rebuilt as three steps with rupee fields, one-tap amounts and sliders with minus/plus.
- Passport stamps and badges appear large in the middle of the screen; the passport page shows stamps on cream tiles.
- Globe / Flat map switch under "Your turn. Spin it." on the home page.

## New in v6

- Inner pages use the sunset look of the first published version; no cream page backgrounds.
- Every country page has its own illustrated backdrop (`src/components/Scene.tsx`).
- The quiz is now **the Play Zone**: Clue Chase, Higher or Lower, Flag Run, with XP, levels and a daily streak.
- **Community facts** with an approval queue, and **your own analytics dashboard**, both at `/admin`. See [BACKEND.md](./BACKEND.md).
- Home: the globe keeps turning, the last screen has a Globe / Flat map switch, and the first screen explains the site.

## Run it locally

You need Node.js 18.18 or newer.

```bash
npm install
cp .env.example .env.local   # optional: add your GA4 ID and Formspree ID
npm run dev
```

Open http://localhost:3000. Other commands: `npm run build` (production build), `npm run start` (serve the build), `npm run typecheck`.

## Deploy on Vercel, step by step

1. Create a new empty repository on GitHub.
2. In this folder:
   ```bash
   git init
   git add .
   git commit -m "Passport Stories"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
3. Go to https://vercel.com/new, sign in with GitHub and **Import** the repository.
4. Vercel detects Next.js by itself. Leave the build settings alone.
5. Open **Environment Variables** and add:
   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_GA_ID` | Your GA4 Measurement ID, e.g. `G-ABC123XYZ` |
   | `NEXT_PUBLIC_FORMSPREE_ID` | Your Formspree form ID |
   | `NEXT_PUBLIC_SITE_URL` | The final site address, e.g. `https://passport-stories.vercel.app` |
6. Press **Deploy**. Every later `git push` redeploys automatically.

If you add or change an environment variable later, redeploy for it to take effect.

## Where to plug things in

| What | Where |
|---|---|
| GA4 Measurement ID | `NEXT_PUBLIC_GA_ID` environment variable. Details in [ANALYTICS.md](./ANALYTICS.md) |
| Ask the Map form | Create a free form at https://formspree.io, copy the ID from its URL (`https://formspree.io/f/abcdwxyz` gives `abcdwxyz`) into `NEXT_PUBLIC_FORMSPREE_ID`. Without it the form runs in preview mode and sends nothing |
| Instagram and YouTube links | `social` in `src/data/site.ts` |
| Reels and Shorts | `reels` in `src/data/site.ts`. Add a YouTube video ID to `youtubeId` to embed it; empty entries show a placeholder tile |
| Logo | Put the real badge at `public/logo.png`, then set `logo: '/logo.png'` in `src/data/site.ts`. Until then a placeholder SVG badge is used |
| Country of the Week | Rotates automatically every week. To pin one, set `countryOfTheWeek: 'japan'` in `src/data/site.ts` |
| Team description on About | `team` in `src/data/site.ts` |

## Editing content

All content lives in `src/data/`. Components never contain country text, so content can be edited without touching the interface.

```
src/data/
  types.ts            the schema (start here)
  helpers.ts          s() for sample numbers, v() for verified ones
  topics.ts           the 6 topics, the metric definitions, map layers
  flight.ts           the home page route
  site.ts             links, reels, logo, Country of the Week
  countries/
    index.ts          the list of countries
    india.ts ...      one file per country
```

### Edit a country

Open its file, for example `src/data/countries/japan.ts`, and change the text or numbers. Each of the six topics has a `headline`, `summary`, `highlights`, `vsIndia` (the "Compared with India" text) and `sources`. Adding a `story` array of paragraphs turns a short entry into a full-length page (see `india.ts`).

### Replace a sample number with a verified one

```ts
// before
workHours: s(34),
// after
workHours: v(34.3, 'OECD, average usual weekly hours, 2024'),
```

`v()` removes the "sample" tag for that figure everywhere it appears. The About page counts how many sample figures remain.

### Add a country

1. Copy an existing file in `src/data/countries/` and rename it, for example `vietnam.ts`.
2. Fill in every field. `geo` is where the country's light and flag sit on the globe.
3. Add its square flag SVG to `public/flags/` and its code to `FLAG_CODES` in `src/components/Flag.tsx`.
4. Import it in `src/data/countries/index.ts` and add it to the `COUNTRIES` array.

Pages, the home globe's lights, compare combinations, search, the quiz and the sitemap pick it up automatically. Two places hard-code the number 20 and need a manual update: the passport counter in `src/components/Header.tsx` and the stamp text in `src/lib/passport.ts`.

## Project structure

```
src/
  app/                 routes (one folder per URL)
  components/
    flight/            the home page: FlightHome.tsx (scrolling, input) and world.ts (3D scene)
    compare/ life/ quiz/ ask/ passport/
    BoardingPass.tsx   the ticket card used across the site
    FlightProvider.tsx the quick "Now boarding" page change
    Stamp.tsx, StampToast.tsx
    Header.tsx, Footer.tsx, Breadcrumbs.tsx, SearchPalette.tsx
  data/                all content (see above); flight.ts is the home page route
  lib/
    analytics.ts       GA4 events and UTM handling
    passport.ts        stamps and badges (localStorage)
    yourLife.ts        the Your Life calculation
    shareCard.ts       draws the 1080x1920 story cards on a canvas
    og.tsx             Open Graph image layout
public/
  textures/            Earth day and night images (NASA, public domain), 2048 px wide
  flags/               one square SVG flag per country (see src/components/Flag.tsx)
  logo.svg             placeholder badge
assets/fonts/          font used by the Open Graph images
```

## How the Your Life numbers are calculated

See `src/lib/yourLife.ts`. In short:

- **Salary to live the same** = your salary x (destination cost index / India cost index) x exchange rate.
- **Rent as share of pay** compares your rent/salary with the destination's typical share.
- **Free time** = (your weekly hours minus theirs, plus the commute difference over 5 days) x 48 working weeks.

It is a simple, transparent model meant to start a conversation. It is not financial advice, and it currently runs on sample figures.

## Performance and accessibility

- three.js is loaded only on the home page, after the page is interactive. The scene is one textured sphere, about 20 points, five thin trails and a nine-vertex plane, with render resolution capped. It stops drawing when the tab is hidden or the flight has scrolled away.
- The two Earth images total about 390 KB.
- Fonts are self-hosted through Fontsource.
- All pages are statically generated. Comparison and Your Life share images are generated on first request and cached.
- **No WebGL:** the text, numbers and buttons of every screen still show; only the globe is missing.
- **Reduced motion:** the plane and text jump to each stop instead of gliding.
- **Keyboard:** skip link, visible focus rings, arrow and page keys fly the route, the route bar buttons jump to any stop, and every country is also reachable from the Countries list and search. The globe itself is pointer-only.
- Lighthouse has not been run on a deployed copy yet. Run it against the Vercel URL after the first deploy.

## Known limitations

- Statistics are sample values and country copy is draft (see the note at the top).
- On the home page the mouse wheel is taken over for the seven flight screens (one notch, one screen). Some people dislike that; it is what makes the flight feel instant.
- Flags are SVG images on the main screens, so they show on Windows. A few minor spots (search results, the passport grid) still use emoji flags, which Windows shows as two-letter codes.
- The story card download saves a PNG; sharing straight into Instagram from the browser is not possible, so visitors upload it from their gallery.

## Licences

Earth imagery: NASA Blue Marble and Black Marble (public domain), via the three-globe project. Fonts: Bricolage Grotesque, DM Sans, JetBrains Mono (SIL Open Font License). Flags: flag-icons (MIT).
