'use client';

/**
 * HERO: The Culture Map. An illustrated world at dusk, in three states.
 *
 *  1. Opening (about 8s, once per visit, skippable by any wheel, key, touch
 *     or click). A camera drifts through one painted world:
 *       lantern moment on the bridge  >  tea under the blossoms
 *       >  the evening market  >  the whole world, then the words.
 *     Petal gusts and lantern light carry each move; nothing is a slide.
 *  2. Settled. The world keeps living: sky lanterns rise, lamps flicker,
 *     petals drift, fabrics and flags flutter, steam curls, birds pass,
 *     water ripples. Hover or touch answers: lanterns glow, the tree lets go
 *     of petals, tea steams harder, water rings, and every scene can name
 *     its place (a click finds it on the globe). The pointer adds depth.
 *  3. Closing. The stage is sticky inside a taller runway. Scrolling walks
 *     the camera down the path towards the water while the two banks part
 *     like curtains, lanterns stream upward and a warm mist becomes the
 *     next section.
 *
 * The art lives in cultureWorld.tsx as layered SVG; this file is the camera,
 * the particles (one canvas) and the interactions. Reduced motion: no
 * opening, no ambient motion, the closing becomes a simple fade.
 */
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import CultureWorld, { SPOTS } from '@/components/home/cultureWorld';
import { jetSeam } from '@/components/home/jetSeam';
import { track } from '@/lib/analytics';

const W = 1600;
const H = 900;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

type Cam = { cx: number; cy: number; s: number; dim: number; words: number };
type Lantern = { x: number; y: number; vy: number; ph: number; size: number; d: number; glow: number; hot: number };
type Petal = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; flip: number; size: number; d: number; c: string; life: number };
type Mote = { x: number; y: number; vx: number; vy: number; r: number; ph: number };
type Ring = { x: number; y: number; t: number };

const PETALS = ['#f7a9c0', '#fbc4d3', '#f08db0', '#ffd9e4', '#e7789f'];

/** The camera stops of the opening, in world units. */
const SHOTS = {
  lantern: { cx: 792, cy: 560, s: 2.6 },
  tea: { cx: 300, cy: 700, s: 2.2 },
  market: { cx: 1300, cy: 640, s: 2.1 },
  world: { cx: 800, cy: 450, s: 1 },
};

export default function CultureHero({ onPick }: { onPick?: (slug: string) => void }) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const cam = useRef<SVGGElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [intro, setIntro] = useState(true);
  const [spot, setSpot] = useState<string | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    // The illustrated hero has no jet of its own: the globe keeps its guide jet.
    jetSeam.set('globe');
  }, []);

  useEffect(() => {
    const el = root.current;
    const st = stage.current;
    const sv = svg.current;
    const camG = cam.current;
    const canvas = cv.current;
    if (!el || !st || !sv || !camG || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const phone = () => st.clientWidth < 768;
    const layers = Array.from(sv.querySelectorAll<SVGGElement>('[data-depth]')).map((g) => ({ g, d: parseFloat(g.dataset.depth || '0') }));
    const bankL = sv.querySelector<SVGGElement>('#cw-bank-l');
    const bankR = sv.querySelector<SVGGElement>('#cw-bank-r');
    const fore = sv.querySelector<SVGGElement>('#cw-fore');

    /* ------------------------------ state ------------------------------ */
    const c: Cam = { ...SHOTS.world, dim: 0, words: 0 };
    const ptr = { x: 0, y: 0, tx: 0, ty: 0, sx: -1, sy: -1, over: false };
    let p = 0; // closing progress
    let pSm = 0;
    let vw = 1;
    let vh = 1;
    let dpr = 1;
    let k = 1; // world to screen scale (slice)
    let ox = 0;
    let oy = 0;
    let raf = 0;
    let visible = true;
    let last = performance.now();
    let introDone = reduce;
    let drift = 0; // phone panning
    let dragPan = 0;

    const size = () => {
      vw = st.clientWidth;
      vh = st.clientHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      k = Math.max(vw / W, vh / H);
      ox = (vw - W * k) / 2;
      oy = (vh - H * k) / 2;
    };
    size();

    /** Camera target in the settled state (phones pan slowly across the world). */
    const settled = () => {
      if (!phone()) return SHOTS.world;
      const span = Math.max(0, (W - vw / k) / 2 - 30);
      return { cx: 800 + Math.sin(drift) * span * 0.75 + dragPan, cy: 470, s: 1 };
    };

    /** Layer offset for parallax and for the closing curtains. */
    const layerShift = (d: number) => ({ x: -ptr.x * d * 22, y: -ptr.y * d * 12 });
    /** World point (at a layer depth) to screen pixels. */
    const toScreen = (wx: number, wy: number, d: number) => {
      const sh = layerShift(d);
      return { x: ox + k * ((wx + sh.x - c.cx) * c.s + W / 2), y: oy + k * ((wy + sh.y - c.cy) * c.s + H / 2) };
    };
    const toWorld = (sx: number, sy: number, d: number) => {
      const sh = layerShift(d);
      return { x: ((sx - ox) / k - W / 2) / c.s + c.cx - sh.x, y: ((sy - oy) / k - H / 2) / c.s + c.cy - sh.y };
    };

    /* ----------------------------- particles ----------------------------- */
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const lanterns: Lantern[] = [];
    const newLantern = (fromWater: boolean): Lantern => ({
      x: fromWater ? rand(560, 1060) : rand(-100, 1700),
      y: fromWater ? rand(560, 640) : rand(80, 620),
      vy: rand(8, 16),
      ph: rand(0, Math.PI * 2),
      size: rand(0.7, 1.25),
      d: rand(0.2, 0.55),
      glow: rand(0.7, 1),
      hot: 0,
    });
    const nLanterns = reduce ? 9 : phone() ? 10 : 18;
    for (let i = 0; i < nLanterns; i++) lanterns.push(newLantern(false));

    const petals: Petal[] = [];
    const addPetal = (x: number, y: number, d: number, burst = false) => {
      if (petals.length > 220) return;
      petals.push({
        x,
        y,
        vx: burst ? rand(-40, 40) : rand(8, 30),
        vy: burst ? rand(-30, 10) : rand(6, 18),
        rot: rand(0, Math.PI * 2),
        vr: rand(-2, 2),
        flip: rand(0, Math.PI * 2),
        size: rand(3.2, 6) * (d > 0.9 ? 1.6 : 1),
        d,
        c: PETALS[(Math.random() * PETALS.length) | 0],
        life: 1,
      });
    };
    const gust = (n: number) => {
      // a sweep of large near petals across the frame: the scene to scene wipe
      for (let i = 0; i < n; i++) {
        const w = toWorld(rand(vw * 0.6, vw * 1.3), rand(-vh * 0.2, vh * 0.9), 1);
        const pp: Petal = { x: w.x, y: w.y, vx: rand(-520, -260), vy: rand(30, 120), rot: rand(0, 6), vr: rand(-4, 4), flip: rand(0, 6), size: rand(6, 12), d: 1, c: PETALS[i % PETALS.length], life: 1 };
        petals.push(pp);
      }
    };

    const motes: Mote[] = Array.from({ length: reduce ? 0 : phone() ? 16 : 34 }, () => ({ x: Math.random(), y: Math.random(), vx: rand(-0.004, 0.004), vy: rand(-0.012, -0.004), r: rand(0.8, 2.2), ph: rand(0, 6) }));
    const rings: Ring[] = [];

    // A glow sprite, drawn once.
    const glow = document.createElement('canvas');
    glow.width = glow.height = 128;
    {
      const g = glow.getContext('2d')!;
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, 'rgba(255,232,170,0.95)');
      grd.addColorStop(0.3, 'rgba(255,186,103,0.45)');
      grd.addColorStop(1, 'rgba(255,138,76,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
    }

    /* ------------------------------ render ------------------------------ */
    const applyCamera = () => {
      camG.setAttribute('transform', `translate(${W / 2} ${H / 2}) scale(${c.s.toFixed(4)}) translate(${(-c.cx).toFixed(2)} ${(-c.cy).toFixed(2)})`);
      const part = ease(clamp((pSm - 0.05) / 0.75));
      for (const { g, d } of layers) {
        const sh = layerShift(d);
        g.setAttribute('transform', `translate(${sh.x.toFixed(2)} ${sh.y.toFixed(2)})`);
      }
      bankL?.setAttribute('transform', `translate(${(-part * 760).toFixed(1)} ${(part * 60).toFixed(1)})`);
      bankR?.setAttribute('transform', `translate(${(part * 760).toFixed(1)} ${(part * 60).toFixed(1)})`);
      if (fore) {
        const sh = layerShift(1);
        fore.setAttribute('transform', `translate(${sh.x.toFixed(2)} ${(sh.y + part * 260).toFixed(2)})`);
        fore.style.opacity = String(1 - part * 0.9);
      }
      st.style.setProperty('--dim', c.dim.toFixed(3));
      st.style.setProperty('--words', c.words.toFixed(3));
      st.style.setProperty('--close', pSm.toFixed(4));
      st.style.setProperty('--mist', ease(clamp((pSm - 0.5) / 0.45)).toFixed(4));
    };

    const drawLantern = (x: number, y: number, s: number, g: number) => {
      const gw = 70 * s * (0.8 + g * 0.6);
      ctx.globalAlpha = 0.55 + g * 0.45;
      ctx.drawImage(glow, x - gw / 2, y - gw / 2, gw, gw);
      ctx.globalAlpha = 1;
      // a paper lantern: rounded shoulders, lit from the flame at its base
      const w = 8 * s;
      const h = 11 * s;
      const grd = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
      grd.addColorStop(0, '#e9823f');
      grd.addColorStop(0.55, '#ffc46a');
      grd.addColorStop(1, '#fff1c2');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.5, y - h / 2);
      ctx.quadraticCurveTo(x, y - h * 0.62, x + w * 0.5, y - h / 2);
      ctx.quadraticCurveTo(x + w * 0.78, y, x + w * 0.62, y + h / 2);
      ctx.quadraticCurveTo(x, y + h * 0.58, x - w * 0.62, y + h / 2);
      ctx.quadraticCurveTo(x - w * 0.78, y, x - w * 0.5, y - h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,70,40,0.35)';
      ctx.lineWidth = Math.max(0.6, s * 0.5);
      ctx.beginPath();
      ctx.moveTo(x, y - h * 0.52);
      ctx.lineTo(x, y + h * 0.5);
      ctx.stroke();
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ph = phone();

      // closing progress from the runway
      const r = el.getBoundingClientRect();
      const run = Math.max(1, el.offsetHeight - st.offsetHeight);
      p = clamp(-r.top / run);
      pSm += (p - pSm) * (reduce ? 1 : Math.min(1, dt * 9));

      // pointer depth (eased)
      ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 4);
      ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 4);

      // settled camera + closing walk down the path
      if (introDone) {
        if (ph && !reduce) drift += dt * 0.12;
        const base = settled();
        const q = ease(clamp(pSm / 0.9));
        const tx = base.cx + (800 - base.cx) * q;
        const ty = base.cy + (700 - base.cy) * q;
        const ts = base.s * (1 + q * (ph ? 0.9 : 1.5));
        const kk = reduce ? 1 : Math.min(1, dt * 5);
        c.cx += (tx - c.cx) * kk;
        c.cy += (ty - c.cy) * kk;
        c.s += (ts - c.s) * kk;
      }
      applyCamera();

      // ---- canvas ----
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);

      // motes
      for (const m of motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y < -0.05) {
          m.y = 1.05;
          m.x = Math.random();
        }
        const a = 0.35 + Math.sin(now / 700 + m.ph) * 0.3;
        ctx.globalAlpha = clamp(a);
        ctx.fillStyle = '#fff1c4';
        ctx.beginPath();
        ctx.arc(m.x * vw, m.y * vh, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // sky lanterns: rise, sway, glow brighter near the pointer; stream up while closing
      const rush = 1 + pSm * 5;
      for (const L of lanterns) {
        if (!reduce) {
          L.y -= L.vy * dt * rush;
          L.ph += dt * 0.8;
        }
        const sx = Math.sin(L.ph) * 10;
        const sp = toScreen(L.x + sx, L.y, L.d);
        if (ptr.over && ptr.sx >= 0) {
          const dd = Math.hypot(sp.x - ptr.sx, sp.y - ptr.sy);
          const near = dd < 70 ? 1 - dd / 70 : 0;
          L.hot += (near - L.hot) * Math.min(1, dt * 6);
          if (near > 0) L.x += ((sp.x - ptr.sx) / (dd || 1)) * near * dt * 30;
        } else L.hot *= 0.95;
        if (sp.y < -80) {
          Object.assign(L, newLantern(true));
          continue;
        }
        const scale = L.size * k * c.s * (0.55 + L.d * 0.7);
        const flick = 0.85 + Math.sin(now / 160 + L.ph * 7) * 0.08 + Math.sin(now / 53 + L.ph) * 0.04;
        drawLantern(sp.x, sp.y, scale, clamp(L.glow * flick + L.hot * 0.8, 0, 1.6));
      }

      // ambient petals from the canopy (settled) or nothing (reduced)
      if (!reduce && Math.random() < dt * (ph ? 3 : 6) * (1 - pSm)) addPetal(rand(70, 560), rand(380, 560), 0.68);
      for (let i = petals.length - 1; i >= 0; i--) {
        const pe = petals[i];
        const wind = Math.sin(now / 1300 + pe.flip) * 14;
        pe.vx += ((pe.d > 0.9 ? pe.vx : 18 + wind) - pe.vx) * Math.min(1, dt * 0.8);
        pe.vy += (16 - pe.vy) * Math.min(1, dt * 0.6);
        pe.x += pe.vx * dt;
        pe.y += pe.vy * dt;
        pe.rot += pe.vr * dt;
        pe.flip += dt * 3;
        const sp = toScreen(pe.x, pe.y, pe.d);
        if (sp.y > vh + 30 || sp.x < -60 || sp.x > vw + 60 || pe.y > 930) {
          petals.splice(i, 1);
          continue;
        }
        const s = pe.size * k * c.s * (pe.d > 0.9 ? 1 : 0.9);
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(pe.rot);
        ctx.scale(1, Math.max(0.2, Math.abs(Math.cos(pe.flip))));
        ctx.fillStyle = pe.c;
        ctx.globalAlpha = 0.92;
        ctx.beginPath();
        ctx.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      // water rings
      for (let i = rings.length - 1; i >= 0; i--) {
        const g = rings[i];
        g.t += dt;
        if (g.t > 1.6) {
          rings.splice(i, 1);
          continue;
        }
        const sp = toScreen(g.x, g.y, 0.42);
        const rad = (10 + g.t * 60) * k * c.s;
        ctx.strokeStyle = `rgba(255,236,210,${(1 - g.t / 1.6) * 0.7})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y, rad, rad * 0.16, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (visible && !(reduce && introDone && Math.abs(p - pSm) < 0.001 && !ptr.over)) raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (!raf && visible) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    /* ------------------------------ opening ------------------------------ */
    let tl: gsap.core.Timeline | null = null;
    const finishIntro = () => {
      introDone = true;
      setIntro(false);
      setRevealed(true);
      try {
        sessionStorage.setItem('ps-hero-intro', '1');
      } catch {}
    };
    const seen = (() => {
      try {
        return sessionStorage.getItem('ps-hero-intro') === '1';
      } catch {
        return false;
      }
    })();

    if (reduce) {
      Object.assign(c, SHOTS.world, { dim: 0, words: 1 });
      finishIntro();
    } else if (seen) {
      // a short version on repeat visits: a gentle drift in, then the words
      Object.assign(c, { cx: 800, cy: 520, s: 1.35, dim: 0.25, words: 0 });
      tl = gsap.timeline({ onComplete: finishIntro });
      tl.to(c, { ...settled(), dim: 0, duration: 1.8, ease: 'power3.inOut' }).to(c, { words: 1, duration: 0.9, ease: 'power2.out' }, '-=0.6');
    } else {
      const f = phone() ? 0.8 : 1;
      const shot = (s: { cx: number; cy: number; s: number }) => ({ cx: s.cx, cy: s.cy, s: Math.max(1, s.s * f) });
      Object.assign(c, shot(SHOTS.lantern), { s: SHOTS.lantern.s * f * 1.12, dim: 0.55, words: 0 });
      // the lantern moment: a burst of lanterns lifting from the bridge
      for (let i = 0; i < 8; i++) {
        lanterns[i].x = rand(700, 900);
        lanterns[i].y = rand(520, 640);
        lanterns[i].d = 0.42;
      }
      tl = gsap.timeline({ onComplete: finishIntro });
      tl.to(c, { ...shot(SHOTS.lantern), dim: 0.32, duration: 1.9, ease: 'sine.inOut' })
        .add(() => gust(phone() ? 26 : 44), '-=0.25')
        .to(c, { ...shot(SHOTS.tea), dim: 0.12, duration: 1.35, ease: 'power3.inOut' })
        .add(() => {
          for (let i = 0; i < 24; i++) addPetal(rand(120, 520), rand(380, 520), 0.68, true);
        }, '-=0.3')
        .to(c, { cx: '+=26', s: `+=${0.06 * f}`, duration: 0.9, ease: 'sine.inOut' })
        .add(() => gust(phone() ? 22 : 36), '-=0.2')
        .to(c, { ...shot(SHOTS.market), dim: 0.04, duration: 1.35, ease: 'power3.inOut' })
        .to(c, { cx: '-=30', duration: 0.9, ease: 'sine.inOut' })
        .to(c, { ...settled(), dim: 0, duration: 1.9, ease: 'power3.inOut' })
        .to(c, { words: 1, duration: 1, ease: 'power2.out' }, '-=0.7');
    }
    applyCamera();

    const skip = () => {
      if (!tl || introDone) return;
      track('hero_intro_skipped', { at: +tl.time().toFixed(2) });
      tl.timeScale(6);
    };
    const onKey = (e: KeyboardEvent) => {
      if (['Tab', 'Shift', 'Alt', 'Control', 'Meta'].includes(e.key)) return;
      skip();
    };

    /* ---------------------------- interactions ---------------------------- */
    let lastPetal = 0;
    let downX = 0;
    let dragging = false;
    const spotOf = (t: EventTarget | null) => (t instanceof Element ? (t.closest('[data-spot]') as SVGGElement | null) : null);

    const onMove = (e: PointerEvent) => {
      const b = st.getBoundingClientRect();
      ptr.sx = e.clientX - b.left;
      ptr.sy = e.clientY - b.top;
      ptr.over = true;
      if (e.pointerType === 'mouse') {
        ptr.tx = (ptr.sx / b.width) * 2 - 1;
        ptr.ty = (ptr.sy / b.height) * 2 - 1;
      }
      if (dragging && phone()) {
        dragPan -= (e.clientX - downX) / (k * c.s);
        dragPan = clamp(dragPan, -500, 500);
        downX = e.clientX;
      }
      const sEl = spotOf(e.target);
      const id = sEl?.dataset.spot ?? null;
      if (introDone) setSpot((cur) => (cur === id ? cur : id));
      st.dataset.hover = id ?? '';
      if (tip.current && id) tip.current.style.transform = `translate(${Math.min(ptr.sx + 16, b.width - 260)}px, ${ptr.sy + 18}px)`;
      // the tree lets go of petals under the cursor
      if (id === 'blossom' && performance.now() - lastPetal > 50) {
        lastPetal = performance.now();
        const w = toWorld(ptr.sx, ptr.sy, 0.68);
        addPetal(w.x, w.y, 0.68, true);
      }
      // rings on the water
      if (id === 'water' || (sEl === null && ptr.sy > vh * 0.66 && ptr.sy < vh * 0.84)) {
        const w = toWorld(ptr.sx, ptr.sy, 0.42);
        if (w.y > 615 && w.y < 790 && (rings.length === 0 || rings[rings.length - 1].t > 0.25)) rings.push({ x: w.x, y: w.y, t: 0 });
      }
      wake();
    };
    const onLeave = () => {
      ptr.tx = 0;
      ptr.ty = 0;
      ptr.over = false;
      ptr.sx = -1;
      st.dataset.hover = '';
      setSpot(null);
    };
    const onDown = (e: PointerEvent) => {
      skip();
      downX = e.clientX;
      dragging = e.pointerType !== 'mouse';
      const sEl = spotOf(e.target);
      if (!sEl || !introDone) return;
      const id = sEl.dataset.spot!;
      const b = st.getBoundingClientRect();
      ptr.sx = e.clientX - b.left;
      ptr.sy = e.clientY - b.top;
      setSpot(id);
      st.dataset.hover = id;
      if (tip.current) tip.current.style.transform = `translate(${Math.min(ptr.sx + 12, b.width - 260)}px, ${Math.max(8, ptr.sy - 92)}px)`;
      track('hero_spot_touched', { spot: id });
      if (id === 'blossom') {
        const w = toWorld(ptr.sx, ptr.sy, 0.68);
        for (let i = 0; i < 16; i++) addPetal(w.x + rand(-30, 30), w.y + rand(-20, 20), 0.68, true);
      }
      sEl.classList.add('is-touched');
      setTimeout(() => sEl.classList.remove('is-touched'), 1600);
      wake();
    };
    const onUp = () => {
      dragging = false;
    };
    const onClick = (e: MouseEvent) => {
      if (!introDone) return;
      const sEl = spotOf(e.target);
      if (!sEl) return;
      // mouse: a click finds the place on the globe; touch uses the button in the label
      if ((e as PointerEvent).pointerType === 'mouse' || (e as PointerEvent).pointerType === undefined) {
        if (matchMedia('(hover: hover)').matches) {
          const spt = SPOTS[sEl.dataset.spot!];
          if (spt) onPickRef.current?.(spt.slug);
        }
      }
    };

    /* ------------------------------ lifecycle ------------------------------ */
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (tl) {
        if (visible) tl.resume();
        else tl.pause();
      }
      wake();
    });
    io.observe(st);
    const ro = new ResizeObserver(() => {
      size();
      wake();
    });
    ro.observe(st);
    const onScroll = () => {
      if (window.scrollY > 4) skip();
      wake();
    };
    st.addEventListener('pointermove', onMove);
    st.addEventListener('pointerleave', onLeave);
    st.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    st.addEventListener('click', onClick);
    window.addEventListener('wheel', skip, { passive: true });
    window.addEventListener('touchstart', skip, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    wake();

    return () => {
      tl?.kill();
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      st.removeEventListener('pointermove', onMove);
      st.removeEventListener('pointerleave', onLeave);
      st.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      st.removeEventListener('click', onClick);
      window.removeEventListener('wheel', skip);
      window.removeEventListener('touchstart', skip);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const info = spot ? SPOTS[spot] : null;

  const explore = () => {
    track('hero_explore', { from: 'culture_hero' });
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('explore')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <section ref={root} className="culture-hero relative" aria-labelledby="hero-title">
      <div ref={stage} className={`culture-stage ${revealed ? 'is-revealed' : ''} ${intro ? 'is-intro' : ''}`}>
        <svg ref={svg} className="culture-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label="An illustrated world at dusk: lanterns rising over a bridge, tea under cherry blossoms, an evening market with fabrics and paper flags, a hill town and a pagoda on the skyline.">
          <g ref={cam}>
            <CultureWorld />
          </g>
        </svg>
        <canvas ref={cv} aria-hidden className="culture-canvas" />
        <div aria-hidden className="culture-dusk" />
        <div aria-hidden className="culture-paper" />
        <div aria-hidden className="culture-mist" />

        {/* the words, only after the world is revealed */}
        <div className="culture-copy">
          <p className="culture-intro">Passport Stories Presents</p>
          <h1 id="hero-title" className="culture-title">
            One World. <span>Endless Ways to Live.</span>
          </h1>
          <p className="culture-sub">Discover the extraordinary in someone else’s everyday.</p>
          <button type="button" className="culture-cta" onClick={explore} tabIndex={revealed ? 0 : -1}>
            Explore the Culture Map
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* a place label that follows the hand */}
        <div ref={tip} className={`culture-tip ${info ? 'is-on' : ''}`} role="status" aria-live="polite">
          {info && (
            <>
              <span className="culture-tip-label">{info.label}</span>
              <span className="culture-tip-place">{info.place}</span>
              <button
                type="button"
                className="culture-tip-go"
                onClick={(e) => {
                  e.stopPropagation();
                  onPick?.(info.slug);
                }}
              >
                Find it on the globe →
              </button>
            </>
          )}
        </div>

        {intro && (
          <button type="button" className="culture-skip" onClick={() => window.dispatchEvent(new WheelEvent('wheel'))}>
            Skip intro
          </button>
        )}
      </div>
    </section>
  );
}
