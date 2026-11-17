/**
 * The site's small back end: community facts and first-party analytics events.
 *
 * Two storage engines, chosen automatically:
 *
 *  1. Supabase (free tier), when SUPABASE_URL and SUPABASE_SECRET_KEY are set.
 *     This is what production on Vercel uses. Tables are created with
 *     supabase/schema.sql. Only this server code talks to Supabase, with the
 *     secret key, so the tables can stay locked to the public.
 *  2. A JSON file at .data/db.json, when those are not set and the site is
 *     running on your own computer. Lets everything work on localhost with
 *     no account. Vercel's disk is read-only, so there it reports
 *     "not configured" instead.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';

export interface Fact {
  id: string;
  country: string;
  fact: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  /** One-way hash of the sender's IP, only used to limit spam. Never shown. */
  ip_hash?: string;
}

export interface EventRow {
  ts: string;
  visitor: string;
  session: string;
  event: string;
  path: string;
  params: Record<string, unknown>;
  referrer: string;
  device: string;
  source: string;
  first_seen: string;
}

const URL_ = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const useSupabase = Boolean(URL_ && KEY);
const canUseFile = !process.env.VERCEL;

export const storeMode = (): 'supabase' | 'file' | 'none' => (useSupabase ? 'supabase' : canUseFile ? 'file' : 'none');

export class NotConfigured extends Error {
  constructor() {
    super('Storage is not configured. Add SUPABASE_URL and SUPABASE_SECRET_KEY.');
  }
}

/* ------------------------------- Supabase ------------------------------- */

async function sb<T>(pathAndQuery: string, init: RequestInit = {}, prefer = ''): Promise<T> {
  const res = await fetch(`${URL_}/rest/v1/${pathAndQuery}`, {
    ...init,
    cache: 'no-store',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}), ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/* ------------------------------ Local file ------------------------------ */

const FILE = path.join(process.cwd(), '.data', 'db.json');
interface Db {
  facts: Fact[];
  events: EventRow[];
  attempts?: { ip_hash: string; ts: string }[];
}
async function readDb(): Promise<Db> {
  try {
    return { facts: [], events: [], ...JSON.parse(await fs.readFile(FILE, 'utf8')) };
  } catch {
    return { facts: [], events: [] };
  }
}
/** One change at a time, so two requests landing together cannot overwrite each other. */
let chain: Promise<unknown> = Promise.resolve();
function locked<T>(job: () => Promise<T>): Promise<T> {
  const run = chain.then(job, job);
  chain = run.catch(() => undefined);
  return run;
}
async function writeDb(db: Db) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db));
}

function need() {
  if (storeMode() === 'none') throw new NotConfigured();
}

/* --------------------------------- Facts --------------------------------- */

/** One-way, salted hash of an IP address, so spam can be limited without storing the IP. */
export const hashIp = (ip: string) => createHash('sha256').update(`${ip}|${process.env.ADMIN_PASSWORD || 'ps'}|passport-stories`).digest('hex').slice(0, 24);

/** How many facts this sender has sent in the last hour. */
export async function recentFactsFrom(ipHash: string): Promise<number> {
  need();
  const since = new Date(Date.now() - 36e5).toISOString();
  if (useSupabase) {
    const q = new URLSearchParams({ select: 'id', ip_hash: `eq.${ipHash}`, created_at: `gte.${since}`, limit: '20' });
    const rows = await sb<{ id: string }[]>(`facts?${q}`);
    return rows.length;
  }
  return (await readDb()).facts.filter((f) => f.ip_hash === ipHash && f.created_at >= since).length;
}

/** True when the same fact text was already sent (stops double submits). */
export async function isDuplicateFact(fact: string): Promise<boolean> {
  need();
  if (useSupabase) {
    const q = new URLSearchParams({ select: 'id', fact: `eq.${fact}`, limit: '1' });
    return (await sb<{ id: string }[]>(`facts?${q}`)).length > 0;
  }
  return (await readDb()).facts.some((f) => f.fact === fact);
}

export async function addFact(input: { country: string; fact: string; name: string; ip_hash?: string }): Promise<Fact> {
  need();
  const row: Fact = { id: randomUUID(), ...input, status: 'pending', created_at: new Date().toISOString() };
  if (useSupabase) await sb('facts', { method: 'POST', body: JSON.stringify(row) }, 'return=minimal');
  else
    await locked(async () => {
      const db = await readDb();
      db.facts.push(row);
      await writeDb(db);
    });
  return row;
}

export async function listFacts(opts: { status: Fact['status']; country?: string; limit?: number }): Promise<Fact[]> {
  need();
  const limit = opts.limit || 100;
  if (useSupabase) {
    const q = new URLSearchParams({ select: 'id,country,fact,name,status,created_at', status: `eq.${opts.status}`, order: 'created_at.desc', limit: String(limit) });
    if (opts.country) q.set('country', `eq.${opts.country}`);
    return sb<Fact[]>(`facts?${q}`);
  }
  const db = await readDb();
  return db.facts
    .filter((f) => f.status === opts.status && (!opts.country || f.country === opts.country))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

export async function setFactStatus(id: string, status: Fact['status']) {
  need();
  if (useSupabase) return sb(`facts?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }, 'return=minimal');
  await locked(async () => {
    const db = await readDb();
    const f = db.facts.find((x) => x.id === id);
    if (f) f.status = status;
    await writeDb(db);
  });
}

export async function deleteFact(id: string) {
  need();
  if (useSupabase) return sb(`facts?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }, 'return=minimal');
  await locked(async () => {
    const db = await readDb();
    db.facts = db.facts.filter((x) => x.id !== id);
    await writeDb(db);
  });
}

/* --------------------------------- Events -------------------------------- */

export async function addEvents(rows: EventRow[]) {
  need();
  if (!rows.length) return;
  if (useSupabase) return sb('events', { method: 'POST', body: JSON.stringify(rows) }, 'return=minimal');
  await locked(async () => {
    const db = await readDb();
    db.events.push(...rows);
    if (db.events.length > 50000) db.events = db.events.slice(-50000);
    await writeDb(db);
  });
}

/** Events newer than `sinceIso`, oldest first. Capped so a busy week cannot exhaust memory. */
export async function listEvents(sinceIso: string, cap = 20000): Promise<EventRow[]> {
  need();
  if (!useSupabase) return (await readDb()).events.filter((e) => e.ts >= sinceIso).slice(-cap);
  const out: EventRow[] = [];
  const page = 1000; // Supabase returns at most 1000 rows per request by default
  for (let from = 0; from < cap; from += page) {
    const q = new URLSearchParams({ select: 'ts,visitor,session,event,path,params,referrer,device,source,first_seen', ts: `gte.${sinceIso}`, order: 'ts.asc', limit: String(page), offset: String(from) });
    const rows = await sb<EventRow[]>(`events?${q}`);
    out.push(...rows);
    if (rows.length < page) break;
  }
  return out;
}

/* --------------------------- Sign-in lockout --------------------------- */

/** Failed sign-ins are remembered for this long. */
export const LOCK_MINUTES = 15;
/** Wrong passwords allowed from one sender inside the window. */
export const MAX_TRIES_PER_SENDER = 5;
/** Wrong passwords allowed from everyone together inside the window (stops spread-out guessing). */
export const MAX_TRIES_TOTAL = 30;

const memAttempts: { ip_hash: string; ts: string }[] = [];

/** Record one wrong password. */
export async function recordFailedLogin(ipHash: string) {
  const row = { ip_hash: ipHash, ts: new Date().toISOString() };
  try {
    if (useSupabase) return void (await sb('admin_attempts', { method: 'POST', body: JSON.stringify(row) }, 'return=minimal'));
    if (canUseFile)
      return void (await locked(async () => {
        const db = await readDb();
        const since = new Date(Date.now() - LOCK_MINUTES * 6e4).toISOString();
        db.attempts = [...(db.attempts || []).filter((a) => a.ts >= since), row];
        await writeDb(db);
      }));
  } catch {
    /* fall through to memory */
  }
  memAttempts.push(row);
}

/** Wrong passwords in the last LOCK_MINUTES: from this sender, and from everyone. */
export async function failedLogins(ipHash: string): Promise<{ mine: number; all: number }> {
  const since = new Date(Date.now() - LOCK_MINUTES * 6e4).toISOString();
  let rows: { ip_hash: string; ts: string }[] = [];
  try {
    if (useSupabase) {
      const q = new URLSearchParams({ select: 'ip_hash,ts', ts: `gte.${since}`, limit: String(MAX_TRIES_TOTAL + 5) });
      rows = await sb<{ ip_hash: string; ts: string }[]>(`admin_attempts?${q}`);
    } else if (canUseFile) rows = ((await readDb()).attempts || []).filter((a) => a.ts >= since);
  } catch {
    rows = [];
  }
  rows = [...rows, ...memAttempts.filter((a) => a.ts >= since)];
  return { mine: rows.filter((a) => a.ip_hash === ipHash).length, all: rows.length };
}

/** Forget this sender's failures after a correct password. */
export async function clearFailedLogins(ipHash: string) {
  try {
    if (useSupabase) await sb(`admin_attempts?ip_hash=eq.${encodeURIComponent(ipHash)}`, { method: 'DELETE' }, 'return=minimal');
    else if (canUseFile)
      await locked(async () => {
        const db = await readDb();
        db.attempts = (db.attempts || []).filter((a) => a.ip_hash !== ipHash);
        await writeDb(db);
      });
  } catch {
    /* ignore */
  }
  for (let i = memAttempts.length - 1; i >= 0; i--) if (memAttempts[i].ip_hash === ipHash) memAttempts.splice(i, 1);
}

/* ------------------------------ Admin sign-in ------------------------------ */

/** Locally the password defaults to "passport" so the review page works out of the box. */
export const adminPassword = () => process.env.ADMIN_PASSWORD || (process.env.VERCEL ? '' : 'passport');
export const ADMIN_COOKIE = 'ps_admin';
export const adminToken = () => createHash('sha256').update(`${adminPassword()}|passport-stories-admin`).digest('hex');
export function isAdmin(cookieValue: string | undefined) {
  if (!adminPassword() || !cookieValue) return false;
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(adminToken());
  return a.length === b.length && timingSafeEqual(a, b);
}
export function passwordMatches(given: string) {
  const real = adminPassword();
  if (!real) return false;
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(real).digest();
  return timingSafeEqual(a, b);
}
