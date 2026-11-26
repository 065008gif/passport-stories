/**
 * Google Analytics 4 helpers. Every custom event on the site goes through
 * `track()`, so ANALYTICS.md and this file are the two places to look.
 *
 * With no NEXT_PUBLIC_GA_ID set, nothing is sent; events are printed to the
 * browser console instead, which is handy for checking the tracking plan.
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';

/** The custom events in the tracking plan. */
export type EventName =
  | 'country_view'
  | 'topic_view'
  | 'compare_run'
  | 'your_life_generated'
  | 'share_card_downloaded'
  | 'quiz_completed'
  | 'suggestion_submitted'
  | 'stamp_earned'
  | 'teleport_used'
  | 'outbound_social_click'
  | 'search_used'
  | 'flight_completed'
  | 'ui_click'
  | 'scroll_depth'
  | 'page_time'
  | 'section_view'
  | 'guess_made'
  | 'filter_used'
  | 'picker_used'
  | 'quiz_started'
  | 'fact_submitted'
  | 'map_toggled'
  | 'page_view'
  | 'home_gate_click'
  | 'globe_spun'
  | 'pass_print_started'
  | 'fact_surprise'
  | 'hero_explore'
  | 'map_country_opened';

type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
const UTM_STORE = 'ps_utm';
let initialised = false;

/** gtag expects the raw `arguments` object in the dataLayer, hence this shape. */
function gtag(..._args: unknown[]) {
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

function init() {
  if (initialised || !GA_ID) return;
  initialised = true;
  gtag('js', new Date());
  // Page views are sent by hand (see <Analytics />) so client-side
  // navigations are counted too.
  gtag('config', GA_ID, { send_page_view: false });
}

/**
 * Remember the UTM parameters the visitor landed with (for example from an
 * Instagram bio link). They are kept for the whole session and attached to
 * every event, so conversions can be attributed after the URL changes.
 */
export function captureUtm() {
  if (typeof window === 'undefined') return;
  const q = new URLSearchParams(window.location.search);
  const found: Record<string, string> = {};
  UTM_KEYS.forEach((k) => {
    const val = q.get(k);
    if (val) found[k] = val;
  });
  if (Object.keys(found).length) {
    try {
      sessionStorage.setItem(UTM_STORE, JSON.stringify(found));
    } catch {
      /* storage blocked: ignore */
    }
  }
}

export function getUtm(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(sessionStorage.getItem(UTM_STORE) || '{}');
  } catch {
    return {};
  }
}

/** Send one event to GA4 (or log it when GA is not configured). */
export function track(event: EventName, params: Params = {}) {
  if (typeof window === 'undefined') return;
  const payload = { ...getUtm(), ...params };
  // The on-screen event log (add ?debug=1 to any URL) listens for this.
  window.dispatchEvent(new CustomEvent('ps:analytics', { detail: { event, payload, at: Date.now() } }));
  collect(event, payload);
  if (!GA_ID) {
    // eslint-disable-next-line no-console
    console.info(`[analytics] ${event}`, payload);
    return;
  }
  init();
  gtag('event', event, payload);
}

export function pageview(path: string) {
  track('page_view', { page_path: path, page_location: window.location.href, page_title: document.title });
}

/** Adds UTM tags to links that leave for Instagram / YouTube. */
export function withUtm(url: string, content: string) {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'passportstories');
    u.searchParams.set('utm_medium', 'website');
    u.searchParams.set('utm_content', content);
    return u.toString();
  } catch {
    return url;
  }
}

/* ------------------------------------------------------------------
   First-party analytics: the same events also go to the site's own
   back end (/api/collect) so they can be read in /admin without Google.
   Visitors are anonymous: a random ID kept in this browser, no IP, no
   name. Events are sent in small batches, and on leaving the page.
------------------------------------------------------------------- */

interface Queued {
  event: string;
  path: string;
  ts: number;
  params: Params;
}
let queue: Queued[] = [];
let timer = 0;
let collecting = process.env.NEXT_PUBLIC_COLLECT !== '0';
let wired = false;

function ids() {
  const day = new Date().toISOString().slice(0, 10);
  const rand = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  let visitor = '';
  let first = day;
  let session = '';
  try {
    visitor = localStorage.getItem('ps_vid') || '';
    first = localStorage.getItem('ps_first') || day;
    if (!visitor) {
      visitor = rand();
      localStorage.setItem('ps_vid', visitor);
      localStorage.setItem('ps_first', first);
    }
    session = sessionStorage.getItem('ps_sid') || '';
    if (!session) {
      session = rand();
      sessionStorage.setItem('ps_sid', session);
      sessionStorage.setItem('ps_ref', document.referrer || '');
    }
  } catch {
    visitor = visitor || 'no-storage';
    session = session || 'no-storage';
  }
  return { visitor, session, first };
}

function flush(useBeacon = false) {
  window.clearTimeout(timer);
  timer = 0;
  if (!queue.length || !collecting) return;
  const { visitor, session, first } = ids();
  let referrer = '';
  try {
    const ref = sessionStorage.getItem('ps_ref') || '';
    referrer = ref && !ref.includes(window.location.host) ? new URL(ref).hostname : '';
  } catch {
    /* ignore */
  }
  const body = JSON.stringify({
    visitor,
    session,
    first_seen: first,
    device: window.innerWidth < 640 ? 'phone' : window.innerWidth < 1024 ? 'tablet' : 'laptop',
    referrer,
    source: getUtm().utm_source || referrer || 'direct',
    events: queue,
  });
  queue = [];
  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon('/api/collect', body);
    return;
  }
  fetch('/api/collect', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } })
    .then((r) => {
      if (r.status === 503) collecting = false; // back end not set up: stop trying
    })
    .catch(() => undefined);
}

function collect(event: string, payload: Params) {
  if (!collecting || window.location.pathname.startsWith('/admin')) return;
  if (!wired) {
    wired = true;
    window.addEventListener('pagehide', () => flush(true));
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush(true));
  }
  const { transport_type: _t, page_location: _l, ...params } = payload;
  queue.push({ event, path: String(payload.page_path || window.location.pathname), ts: Date.now(), params });
  // A page view goes out almost at once, so even a two-second visit is counted.
  if (queue.length >= 20) flush();
  else if (event === 'page_view') {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => flush(), 300);
  } else if (!timer) timer = window.setTimeout(() => flush(), 2000);
}
