'use client';

/**
 * "Your Passport": the visitor's stamps, badges and quiz record.
 * Everything lives in localStorage. There is no login and nothing is sent
 * to a server.
 */
import { useSyncExternalStore } from 'react';
import { track } from './analytics';
import { playThunk } from './sound';

export interface PassportState {
  /** country slug -> ISO date the stamp was earned */
  stamps: Record<string, string>;
  /** badge id -> ISO date */
  badges: Record<string, string>;
  quiz: { played: number; best: number; bestStreak: number };
  sound: boolean;
}

export interface BadgeDef {
  id: string;
  name: string;
  how: string;
}

export const BADGES: BadgeDef[] = [
  { id: 'first-flight', name: 'First Flight', how: 'Explore your first country' },
  { id: 'frequent-flyer', name: 'Frequent Flyer', how: 'Collect 5 stamps' },
  { id: 'globetrotter', name: 'Globetrotter', how: 'Collect 10 stamps' },
  { id: 'full-passport', name: 'Full Passport', how: 'Collect all 20 stamps' },
  { id: 'side-by-side', name: 'Side by Side', how: 'Run a comparison' },
  { id: 'parallel-life', name: 'Parallel Life', how: 'Try Your Life in another country' },
  { id: 'quiz-rookie', name: 'Quiz Rookie', how: 'Finish a quiz' },
  { id: 'perfect-landing', name: 'Perfect Landing', how: 'Get a perfect quiz score' },
  { id: 'on-a-roll', name: 'On a Roll', how: 'Guess 5 countries in a row' },
  { id: 'storyteller', name: 'Storyteller', how: 'Send a fact to the community' },
  { id: 'sharp-eye', name: 'Sharp Eye', how: 'Get 5 guesses right on one page' },
  { id: 'tour-guide', name: 'Round the World', how: 'Finish the flight on the home page' },
  { id: 'stowaway', name: 'Stowaway', how: 'A secret. Something on every page is worth tapping five times.' },
];

const KEY = 'ps_passport_v1';
const EMPTY: PassportState = { stamps: {}, badges: {}, quiz: { played: 0, best: 0, bestStreak: 0 }, sound: false };

let state: PassportState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state = { ...EMPTY, ...saved, quiz: { ...EMPTY.quiz, ...(saved.quiz || {}) } };
    }
  } catch {
    /* corrupted or blocked storage: start with an empty passport */
  }
}

function save(next: PassportState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPassport(): PassportState {
  load();
  return state;
}

/** React hook: re-renders whenever the passport changes. */
export function usePassport(): PassportState {
  return useSyncExternalStore(subscribe, getPassport, () => EMPTY);
}

/** Payload of the on-screen toast shown when something is earned. */
export interface ToastDetail {
  kind: 'stamp' | 'badge';
  title: string;
  code: string;
  note: string;
}

function toast(detail: ToastDetail) {
  window.dispatchEvent(new CustomEvent<ToastDetail>('ps:toast', { detail }));
  if (state.sound) playThunk();
}

export function earnBadge(id: string) {
  load();
  if (state.badges[id]) return;
  const def = BADGES.find((b) => b.id === id);
  if (!def) return;
  save({ ...state, badges: { ...state.badges, [id]: new Date().toISOString() } });
  toast({ kind: 'badge', title: def.name, code: '★', note: 'Badge earned' });
}

/** Award a country stamp the first time its page is opened. */
export function earnStamp(country: { slug: string; name: string; airport: string }) {
  load();
  if (state.stamps[country.slug]) return;
  save({ ...state, stamps: { ...state.stamps, [country.slug]: new Date().toISOString() } });
  const total = Object.keys(state.stamps).length;
  track('stamp_earned', { country: country.slug, stamps_total: total });
  toast({ kind: 'stamp', title: country.name, code: country.airport, note: `Stamp ${total} of 20` });
  // Milestone badges appear a moment later so the two toasts do not collide.
  const milestone = total === 1 ? 'first-flight' : total === 5 ? 'frequent-flyer' : total === 10 ? 'globetrotter' : total === 20 ? 'full-passport' : null;
  if (milestone) window.setTimeout(() => earnBadge(milestone), 3200);
}

export function recordQuiz(score: number, max: number, bestStreak: number) {
  load();
  save({
    ...state,
    quiz: {
      played: state.quiz.played + 1,
      best: Math.max(state.quiz.best, score),
      bestStreak: Math.max(state.quiz.bestStreak, bestStreak),
    },
  });
  earnBadge('quiz-rookie');
  if (score === max) window.setTimeout(() => earnBadge('perfect-landing'), 3200);
  if (bestStreak >= 5) window.setTimeout(() => earnBadge('on-a-roll'), 6400);
}

export function setSound(on: boolean) {
  load();
  save({ ...state, sound: on });
  if (on) playThunk();
}

export function resetPassport() {
  save(EMPTY);
}
