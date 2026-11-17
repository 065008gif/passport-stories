# Back end: community facts and your own analytics

The site has a small back end with two jobs:

1. **Community facts.** A visitor sends a fact, sees "We will review and publish your fact within 24 hours", and the fact waits in a queue. You approve or reject it on the `/admin` page. Only approved facts appear on the site (the Community page and the country's own page).
2. **Your own analytics.** Every event the site tracks (page views, clicks, scroll depth, time on page, games, guesses) is also saved to your database, and `/admin` turns it into a dashboard: visitors, sessions, time per page, returning visitors, bounce rate, top clicks, sources, devices and a funnel. This works alongside Google Analytics, not instead of it.

## Try it on your computer first (no account needed)

```
npm run dev
```

- Send a fact at http://localhost:3000/facts
- Open http://localhost:3000/admin and sign in with the password `passport`
- Approve the fact, then look at the Analytics tab

On your computer everything is saved in a file, `.data/db.json`. That file is only for trying things out. It does not exist on Vercel.

## Go live with Supabase (free plan)

1. Create an account at supabase.com and create a new project (the Free plan is enough). Pick any region close to India.
2. In the project, open **SQL Editor**, choose **New query**, paste the whole of `supabase/schema.sql` from this folder and press **Run**. This creates two tables, `facts` and `events`.
3. Open **Project Settings > API** (or **API Keys**) and copy two things: the **Project URL** and the **secret key** (older projects call it the `service_role` key). Keep the secret key private: never put it in a variable that starts with `NEXT_PUBLIC_`.
4. In Vercel, open your project > **Settings > Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | the Project URL, e.g. `https://abcdxyz.supabase.co` |
   | `SUPABASE_SECRET_KEY` | the secret key |
   | `ADMIN_PASSWORD` | a password of your choice for `/admin` |

5. Redeploy. Open `https://your-site/admin`, sign in, and the top line should say "storage: Supabase".

Things to know about the free plan:

- A free Supabase project is paused after about a week with no activity. Opening the site or `/admin` counts as activity; if it does get paused, press Restore in the Supabase dashboard.
- The free database is 500 MB. One event is a few hundred bytes, so a class project is far below that.

## Already ran an older schema.sql?

Run the whole of `supabase/schema.sql` again. It only adds what is missing (the `ip_hash` column and two indexes) and keeps your data.

## Export for analysis

On `/admin` > Analytics, **Export CSV** downloads every event for the last 30 days (or the period picked). The **Features** panel shows boarding passes printed, home page gates, globe spins, comparisons, games and story cards.

## How it is protected

- `/admin` needs the password. Signing in sets a cookie that lasts 12 hours.
- The tables are locked in Supabase (row level security with no public rules). Only the website's server, which holds the secret key, can read or write them.
- Fact submissions are checked: 20 to 280 characters, no links, a hidden field that catches simple bots, at most 5 facts an hour from one sender (the IP address is stored only as a one-way hash), and the same fact twice is ignored. Nothing a visitor writes is shown until you approve it.
- Analytics are anonymous: a random ID stored in the visitor's browser, no name, no IP address. Salary and rent typed into Your Life are never sent.

## Where the code is

| File | Job |
|---|---|
| `src/lib/server/store.ts` | Talks to Supabase (or the local file). Password check. |
| `src/app/api/facts/route.ts` | Visitors: list approved facts, submit a new one |
| `src/app/api/collect/route.ts` | Receives analytics events from the browser |
| `src/app/api/admin/*` | Sign in, review facts, analytics numbers (password only) |
| `src/components/CommunityFacts.tsx` | The fact wall and the submit form |
| `src/components/admin/AdminClient.tsx` | The `/admin` page |
| `src/lib/analytics.ts` | Sends each event to GA4 and to `/api/collect` |
| `supabase/schema.sql` | The two tables |

To switch the first-party analytics off, set `NEXT_PUBLIC_COLLECT=0`.
