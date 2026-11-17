'use client';

/**
 * Ask the Map: suggest a country or topic.
 * Submissions go to Formspree (free tier). Set NEXT_PUBLIC_FORMSPREE_ID.
 * Without an ID the form runs in preview mode and sends nothing.
 */
import { useState } from 'react';
import { site } from '@/data/site';
import { track } from '@/lib/analytics';

const FIELD = 'w-full rounded-xl border-2 border-cream/25 bg-white/[0.06] px-3 py-3 text-lg text-cream placeholder:text-cream/45 focus:border-cream/40';

export default function AskForm() {
  const [kind, setKind] = useState<'country' | 'topic'>('country');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const preview = !site.formspreeId;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (data.get('_gotcha')) return; // spam bots fill hidden fields
    const suggestion = String(data.get('suggestion') || '').trim();
    if (!suggestion) return;
    setStatus('sending');
    try {
      if (!preview) {
        const res = await fetch(`https://formspree.io/f/${site.formspreeId}`, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('Form service rejected the submission');
      }
      track('suggestion_submitted', { suggestion_type: kind, suggestion: suggestion.slice(0, 60), delivered: !preview });
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="panel-dark mx-auto max-w-2xl rounded-2xl p-8 text-center shadow-ticket" role="status">
        <p className="text-5xl" aria-hidden>
          📮
        </p>
        <h2 className="h-display mt-3 text-3xl">Postcard received</h2>
        <p className="mt-2 text-lg text-cream/85">Thank you. If it makes the map, you will see it as a Country of the Week.</p>
        {preview && <p className="mt-3 font-mono text-sm text-cream/70">Preview mode: no form ID is configured yet, so nothing was sent.</p>}
        <button onClick={() => setStatus('idle')} className="btn btn-sun mt-6">
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="panel-dark mx-auto max-w-2xl overflow-hidden rounded-2xl shadow-ticket">
      <p className="flex justify-between strip-sunset px-5 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-ink sm:px-8">
        <span>Postcard to the editors</span>
        <span>Par avion</span>
      </p>
      <div className="space-y-5 p-5 sm:p-8">
        <fieldset>
          <legend className="mb-2 font-semibold">I want to suggest a…</legend>
          <div className="flex gap-2">
            {(['country', 'topic'] as const).map((k) => (
              <label key={k} className={`flex min-h-[44px] cursor-pointer items-center rounded-full border-2 px-4 font-semibold capitalize ${kind === k ? 'border-cream/40 bg-ink text-cream' : 'border-cream/25'}`}>
                <input type="radio" name="type" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
                {k}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="mb-1 block font-semibold">{kind === 'country' ? 'Which country should we cover next?' : 'Which part of everyday life should we cover?'}</span>
          <input name="suggestion" required maxLength={80} className={FIELD} placeholder={kind === 'country' ? 'e.g. Vietnam' : 'e.g. Dating, festivals, pets'} />
        </label>
        <label className="block">
          <span className="mb-1 block font-semibold">
            Why? <span className="font-normal text-cream/70">(optional)</span>
          </span>
          <textarea name="reason" rows={3} maxLength={500} className={FIELD} placeholder="What are you curious about?" />
        </label>
        <label className="block">
          <span className="mb-1 block font-semibold">
            Email <span className="font-normal text-cream/70">(optional, only if you want a reply)</span>
          </span>
          <input name="email" type="email" autoComplete="email" className={FIELD} placeholder="you@example.com" />
        </label>
        {/* Honeypot: hidden from people, tempting for bots */}
        <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={status === 'sending'} className="btn btn-sun">
            {status === 'sending' ? 'Posting…' : 'Post it →'}
          </button>
          {status === 'error' && (
            <p role="alert" className="font-semibold text-coral">
              That did not go through. Please try again in a moment.
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
