'use client';

/**
 * HERO: The Culture Map. An illustrated world at dusk, driven by the scroll.
 *
 * Nothing plays on its own: the hero is a tall runway with a sticky stage,
 * and the scroll position is the camera. Scrolling down (and back up) moves
 * through one painted world:
 *
 *   0.00  lantern moment on the bridge (China)
 *   0.22  tea under the cherry blossoms (Japan)
 *   0.44  alpenglow on the Matterhorn, mist over the lake (Switzerland)
 *   0.66  the whole world, then the words and the button
 *   0.80  closing: the camera walks down the path, the banks part like
 *         curtains, lanterns stream up and a warm mist becomes the globe
 *
 * Between the moments a gust of petals carries the camera, its strength set
 * by how fast you scroll. The world keeps living at every step: sky lanterns
 * with flickering flames and depth blur, petals that tumble in 3D, glints
 * moving on the water, mist, swaying pines and flowers. Hover or touch
 * answers (lantern glow, falling petals, steam, rings on the water, place
 * labels; a click finds a place on the globe).
 *
 * The art lives in cultureWorld.tsx as layered SVG; this file is the camera,
 * the particles (one canvas) and the interactions. Reduced motion: the
 * camera still follows the scroll, nothing else moves on its own.
 */
import { useEffect, useRef, useState } from 'react';
import CultureWorld, { SPOTS } from '@/components/home/cultureWorld';
import { jetSeam } from '@/components/home/jetSeam';
import { track } from '@/lib/analytics';

const W = 1600;
const H = 900;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

type Shot = { p: number; cx: number; cy: number; s: number; dim: number };
type Lantern = { x: number; y: number; vy: number; ph: number; size: number; d: number; glow: number; hot: number; tilt: number };
type Petal = { x: number; y: number; vx: number; vy: number; a: number; b: number; va: number; vb: number; rot: number; size: number; d: number; c: string; back: string };
type Glint = { x: number; y: number; w: number; ph: number; sp: number };
type Mote = { x: number; y: number; vx: number; vy: number; r: number; ph: number };
type Ring = { x: number; y: number; t: number };

const PETALS: [string, string][] = [
  ['#f9b6c8', '#e98fac'],
  ['#fcd0dc', '#f0a6bd'],
  ['#f3a0bb', '#d9789c'],
  ['#ffe2ea', '#f4bccb'],
];

/** The camera path through the world, keyed by scroll progress. */
const PATH = (phone: boolean): Shot[] => {
  const f = phone ? 0.82 : 1;
  return [
    { p: 0.0, cx: 792, cy: 560, s: 2.9 * f, dim: 0.5 },
    { p: 0.1, cx: 795, cy: 556, s: 2.55 * f, dim: 0.34 },
    { p: 0.22, cx: 300, cy: 700, s: 2.25 * f, dim: 0.14 },
    { p: 0.32, cx: 330, cy: 690, s: 2.35 * f, dim: 0.12 },
    { p: 0.44, cx: 1360, cy: 560, s: 2.0 * f, dim: 0.05 },
    { p: 0.54, cx: 1330, cy: 548, s: 2.1 * f, dim: 0.03 },
    { p: 0.68, cx: 800, cy: 450, s: 1, dim: 0 },
  ];
};
const CLOSE_AT = 0.8;

function cameraAt(P: number, path: Shot[]) {
  if (P <= path[0].p) return path[0];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (P <= b.p) {
      const t = smooth((P - a.p) / (b.p - a.p));
      return { p: P, cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t, s: a.s + (b.s - a.s) * t, dim: a.dim + (b.dim - a.dim) * t };
    }
  }
  return path[path.length - 1];
}

export default function CultureHero({ onPick }: { onPick?: (slug: string) => void }) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const cam = useRef<SVGGElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
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
    let path = PATH(phone());
    const c = { ...path[0] };
    const ptr = { x: 0, y: 0, tx: 0, ty: 0, sx: -1, sy: -1, over: false };
    let P = 0; // scroll progress through the runway
    let Ps = 0; // eased
    let lastP = 0;
    let vw = 1;
    let vh = 1;
    let dpr = 1;
    let k = 1;
    let ox = 0;
    let oy = 0;
    let raf = 0;
    let visible = true;
    let last = performance.now();
    let drift = 0;
    let wasRevealed = false;

    const size = () => {
      vw = st.clientWidth;
      vh = st.clientHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      k = Math.max(vw / W, vh / H);
      ox = (vw - W * k) / 2;
      oy = (vh - H * k) / 2;
      path = PATH(phone());
    };
    size();

    const layerShift = (d: number) => ({ x: -ptr.x * d * 22, y: -ptr.y * d * 12 });
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
    const newLantern = (low: boolean): Lantern => ({
      x: low ? rand(560, 1060) : rand(-100, 1700),
      y: low ? rand(540, 640) : rand(60, 600),
      vy: rand(7, 14),
      ph: rand(0, Math.PI * 2),
      size: rand(0.75, 1.2),
      d: Math.random() < 0.18 ? rand(0.75, 1) : rand(0.15, 0.55),
      glow: rand(0.75, 1),
      hot: 0,
      tilt: rand(-0.12, 0.12),
    });
    const nLanterns = reduce ? 10 : phone() ? 12 : 22;
    for (let i = 0; i < nLanterns; i++) lanterns.push(newLantern(i < 8));
    lanterns.sort((a, b) => a.d - b.d);

    const petals: Petal[] = [];
    const addPetal = (x: number, y: number, d: number, kick = 0) => {
      if (petals.length > 260) return;
      const [col, back] = PETALS[(Math.random() * PETALS.length) | 0];
      petals.push({
        x,
        y,
        vx: rand(6, 26) + kick * rand(-1, 0.4),
        vy: rand(4, 14) - kick * rand(0, 0.5),
        a: rand(0, 6.28),
        b: rand(0, 6.28),
        va: rand(1.5, 4.5) * (Math.random() < 0.5 ? -1 : 1),
        vb: rand(1, 3.5),
        rot: rand(0, 6.28),
        size: rand(3.4, 5.6) * (d > 0.9 ? 1.9 : 1),
        d,
        c: col,
        back,
      });
    };
    const gust = (n: number) => {
      // near petals across the frame: the moment to moment wipe
      for (let i = 0; i < n; i++) {
        const w = toWorld(rand(vw * 0.5, vw * 1.25), rand(-vh * 0.2, vh * 0.95), 1);
        addPetal(w.x, w.y, 1, 0);
        const pe = petals[petals.length - 1];
        if (pe) {
          pe.vx = rand(-560, -280);
          pe.vy = rand(20, 110);
        }
      }
    };

    // glints of light on the water, around the sun path and the floating lanterns
    const glints: Glint[] = Array.from({ length: reduce ? 0 : 46 }, () => {
      const nearSun = Math.random() < 0.6;
      return { x: nearSun ? 905 + rand(-140, 140) : rand(560, 1300), y: rand(620, 780), w: rand(6, 26), ph: rand(0, 6.28), sp: rand(0.6, 1.8) };
    });
    const motes: Mote[] = Array.from({ length: reduce ? 0 : phone() ? 16 : 34 }, () => ({ x: Math.random(), y: Math.random(), vx: rand(-0.004, 0.004), vy: rand(-0.012, -0.004), r: rand(0.8, 2.2), ph: rand(0, 6) }));
    const rings: Ring[] = [];

    // sprites, drawn once
    const sprite = (r: number, stops: [number, string][]) => {
      const cvs = document.createElement('canvas');
      cvs.width = cvs.height = r * 2;
      const g = cvs.getContext('2d')!;
      const grd = g.createRadialGradient(r, r, 0, r, r, r);
      stops.forEach(([o, col]) => grd.addColorStop(o, col));
      g.fillStyle = grd;
      g.fillRect(0, 0, r * 2, r * 2);
      return cvs;
    };
    const halo = sprite(64, [
      [0, 'rgba(255,226,160,0.9)'],
      [0.25, 'rgba(255,184,102,0.42)'],
      [1, 'rgba(255,128,70,0)'],
    ]);
    const flame = sprite(32, [
      [0, 'rgba(255,255,240,1)'],
      [0.35, 'rgba(255,220,130,0.85)'],
      [1, 'rgba(255,150,60,0)'],
    ]);
    const bokeh = sprite(64, [
      [0, 'rgba(255,214,140,0.55)'],
      [0.6, 'rgba(255,190,110,0.35)'],
      [0.85, 'rgba(255,170,100,0.12)'],
      [1, 'rgba(255,150,90,0)'],
    ]);

    /* ------------------------------ camera ------------------------------ */
    const applyCamera = (closeP: number) => {
      camG.setAttribute('transform', `translate(${W / 2} ${H / 2}) scale(${c.s.toFixed(4)}) translate(${(-c.cx).toFixed(2)} ${(-c.cy).toFixed(2)})`);
      const part = ease(clamp((closeP - 0.05) / 0.75));
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
      const words = smooth(clamp((Ps - 0.6) / 0.09));
      st.style.setProperty('--dim', c.dim.toFixed(3));
      st.style.setProperty('--words', words.toFixed(3));
      st.style.setProperty('--start', (1 - smooth(clamp(Ps / 0.05))).toFixed(3));
      st.style.setProperty('--close', closeP.toFixed(4));
      st.style.setProperty('--mist', ease(clamp((closeP - 0.5) / 0.45)).toFixed(4));
      const rv = words > 0.5 && closeP < 0.2;
      if (rv !== wasRevealed) {
        wasRevealed = rv;
        setRevealed(rv);
      }
    };

    /* ------------------------------ drawing ------------------------------ */
    const drawLantern = (L: Lantern, x: number, y: number, s: number, g: number, now: number) => {
      // near lanterns are out of focus: a soft bokeh disc instead of a sharp lantern
      if (L.d > 0.7) {
        const r = 34 * s;
        ctx.globalAlpha = 0.6 + Math.min(1, g) * 0.3;
        ctx.drawImage(bokeh, x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
        return;
      }
      const hw = 90 * s * (0.75 + g * 0.55);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, 0.35 + g * 0.35);
      ctx.drawImage(halo, x - hw / 2, y - hw / 2, hw, hw);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      const w = 8 * s;
      const h = 11 * s;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(L.tilt + Math.sin(L.ph * 0.7) * 0.05);
      // paper body, lit from the flame inside
      const grd = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      grd.addColorStop(0, '#d9733c');
      grd.addColorStop(0.45, '#ffb862');
      grd.addColorStop(0.85, '#ffe6a6');
      grd.addColorStop(1, '#fff6d8');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(-w * 0.5, -h / 2);
      ctx.quadraticCurveTo(0, -h * 0.64, w * 0.5, -h / 2);
      ctx.quadraticCurveTo(w * 0.82, 0, w * 0.6, h / 2);
      ctx.quadraticCurveTo(0, h * 0.56, -w * 0.6, h / 2);
      ctx.quadraticCurveTo(-w * 0.82, 0, -w * 0.5, -h / 2);
      ctx.closePath();
      ctx.fill();
      // paper ribs
      ctx.strokeStyle = 'rgba(150,64,34,0.28)';
      ctx.lineWidth = Math.max(0.5, s * 0.45);
      ctx.beginPath();
      ctx.moveTo(-w * 0.18, -h * 0.52);
      ctx.lineTo(-w * 0.22, h * 0.5);
      ctx.moveTo(w * 0.18, -h * 0.52);
      ctx.lineTo(w * 0.22, h * 0.5);
      ctx.stroke();
      // the flame, flickering
      const fl = 0.75 + Math.sin(now / 90 + L.ph * 5) * 0.12 + Math.sin(now / 37 + L.ph) * 0.08;
      const fr = 7 * s * fl;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(flame, -fr, h * 0.32 - fr, fr * 2, fr * 2);
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    };

    const drawPetal = (pe: Petal, x: number, y: number, s: number) => {
      // a cherry petal: rounded with a notch, tumbling on two axes
      const ca = Math.cos(pe.a);
      const cb = Math.cos(pe.b);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(pe.rot);
      ctx.scale(Math.max(0.12, Math.abs(ca)), Math.max(0.2, Math.abs(cb)));
      ctx.fillStyle = ca * cb > 0 ? pe.c : pe.back;
      ctx.globalAlpha = pe.d > 0.9 ? 0.85 : 0.95;
      ctx.beginPath();
      ctx.moveTo(0, s);
      ctx.bezierCurveTo(-s * 1.1, s * 0.4, -s * 0.9, -s * 0.9, -s * 0.18, -s);
      ctx.lineTo(0, -s * 0.72);
      ctx.lineTo(s * 0.18, -s);
      ctx.bezierCurveTo(s * 0.9, -s * 0.9, s * 1.1, s * 0.4, 0, s);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ph = phone();

      // scroll progress
      const r = el.getBoundingClientRect();
      const run = Math.max(1, el.offsetHeight - st.offsetHeight);
      P = clamp(-r.top / run);
      Ps += (P - Ps) * (reduce ? 1 : Math.min(1, dt * 7));
      const speed = Math.abs(P - lastP) / Math.max(dt, 0.001);
      lastP = P;
      const closeP = clamp((Ps - CLOSE_AT) / (1 - CLOSE_AT));

      // petal gusts carry the camera between moments; stronger when you scroll faster
      const inTransit = (Ps > 0.11 && Ps < 0.23) || (Ps > 0.33 && Ps < 0.45);
      if (inTransit && !reduce && speed > 0.01) {
        const n = Math.min(10, speed * 60 * dt * 60);
        if (Math.random() < n / 10) gust(Math.ceil(n / 3));
      }

      ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 4);
      ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 4);

      // camera: the scroll path, then (settled) a slow drift on phones, then the closing walk
      const shot = cameraAt(Ps, path);
      let tcx = shot.cx;
      let tcy = shot.cy;
      let ts = shot.s;
      if (Ps >= 0.68 && ph) {
        if (!reduce) drift += dt * 0.12;
        const span = Math.max(0, (W - vw / k) / 2 - 30);
        tcx = 800 + Math.sin(drift) * span * 0.7 * (1 - closeP);
        tcy = 470;
      }
      const q = ease(clamp(closeP / 0.9));
      tcx += (800 - tcx) * q;
      tcy += (700 - tcy) * q;
      ts *= 1 + q * (ph ? 0.9 : 1.5);
      const kk = reduce ? 1 : Math.min(1, dt * 6);
      c.cx += (tcx - c.cx) * kk;
      c.cy += (tcy - c.cy) * kk;
      c.s += (ts - c.s) * kk;
      c.dim += (shot.dim - c.dim) * kk;
      applyCamera(closeP);

      // ---- canvas ----
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);

      // glints on the water
      ctx.globalCompositeOperation = 'lighter';
      for (const g of glints) {
        g.ph += dt * g.sp;
        g.x += dt * 6;
        if (g.x > 1320) g.x = 560;
        const a = Math.max(0, Math.sin(g.ph)) * 0.55;
        if (a < 0.02) continue;
        const sp = toScreen(g.x, g.y, 0.42);
        const w = g.w * k * c.s * (0.6 + Math.sin(g.ph * 0.5) * 0.4);
        ctx.strokeStyle = `rgba(255,236,196,${a.toFixed(3)})`;
        ctx.lineWidth = Math.max(0.8, 1.2 * k * c.s * 0.6);
        ctx.beginPath();
        ctx.moveTo(sp.x - w / 2, sp.y);
        ctx.lineTo(sp.x + w / 2, sp.y);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';

      // motes
      for (const m of motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y < -0.05) {
          m.y = 1.05;
          m.x = Math.random();
        }
        ctx.globalAlpha = clamp(0.35 + Math.sin(now / 700 + m.ph) * 0.3);
        ctx.fillStyle = '#fff1c4';
        ctx.beginPath();
        ctx.arc(m.x * vw, m.y * vh, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // sky lanterns: far ones small and sharp, near ones soft bokeh; stream up while closing
      const rush = 1 + closeP * 5;
      for (const L of lanterns) {
        if (!reduce) {
          L.y -= L.vy * dt * rush * (0.6 + L.d * 0.6);
          L.ph += dt * 0.8;
          L.x += Math.sin(L.ph * 0.6) * dt * 4;
        }
        const sp = toScreen(L.x + Math.sin(L.ph) * 8, L.y, L.d);
        if (ptr.over && ptr.sx >= 0) {
          const dd = Math.hypot(sp.x - ptr.sx, sp.y - ptr.sy);
          const near = dd < 80 ? 1 - dd / 80 : 0;
          L.hot += (near - L.hot) * Math.min(1, dt * 6);
          if (near > 0) L.x += ((sp.x - ptr.sx) / (dd || 1)) * near * dt * 30;
        } else L.hot *= 0.95;
        if (sp.y < -120) {
          Object.assign(L, newLantern(true), { d: L.d });
          continue;
        }
        const scale = L.size * k * c.s * (0.45 + L.d * 0.9);
        drawLantern(L, sp.x, sp.y, scale, clamp(L.glow + L.hot * 0.8, 0, 1.7), now);
      }

      // petals: ambient from the canopy, with wind gusts and flutter
      if (!reduce && Math.random() < dt * (ph ? 4 : 7) * (1 - closeP)) addPetal(rand(70, 560), rand(380, 560), 0.68);
      const wind = 16 + Math.sin(now / 2300) * 10 + Math.max(0, Math.sin(now / 5100)) * 26;
      for (let i = petals.length - 1; i >= 0; i--) {
        const pe = petals[i];
        const target = pe.d > 0.9 && pe.vx < -100 ? pe.vx : wind;
        pe.vx += (target - pe.vx) * Math.min(1, dt * 0.9);
        // flutter: a falling petal sways and catches the air
        pe.vy += (14 + Math.sin(pe.a * 2) * 10 - pe.vy) * Math.min(1, dt * 1.2);
        pe.x += pe.vx * dt + Math.cos(pe.b) * dt * 8;
        pe.y += pe.vy * dt;
        pe.a += pe.va * dt;
        pe.b += pe.vb * dt;
        pe.rot += pe.va * 0.2 * dt;
        const sp = toScreen(pe.x, pe.y, pe.d);
        if (sp.y > vh + 40 || sp.x < -80 || sp.x > vw + 80 || pe.y > 940) {
          petals.splice(i, 1);
          continue;
        }
        drawPetal(pe, sp.x, sp.y, pe.size * k * c.s * 0.9);
      }

      // water rings
      for (let i = rings.length - 1; i >= 0; i--) {
        const g = rings[i];
        g.t += dt;
        if (g.t > 1.8) {
          rings.splice(i, 1);
          continue;
        }
        const sp = toScreen(g.x, g.y, 0.42);
        for (let j = 0; j < 2; j++) {
          const tt = g.t - j * 0.25;
          if (tt <= 0) continue;
          const rad = (8 + tt * 55) * k * c.s;
          ctx.strokeStyle = `rgba(255,236,210,${((1 - tt / 1.8) * 0.65).toFixed(3)})`;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.ellipse(sp.x, sp.y, rad, rad * 0.16, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      if (visible) raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (!raf && visible) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    /* ---------------------------- interactions ---------------------------- */
    let lastPetal = 0;
    const spotOf = (t: EventTarget | null) => (t instanceof Element ? (t.closest('[data-spot]') as SVGGElement | null) : null);
    const placeTip = (x: number, y: number, b: DOMRect, above = false) => {
      if (tip.current) tip.current.style.transform = `translate(${Math.min(x + 16, b.width - 260)}px, ${above ? Math.max(8, y - 96) : y + 18}px)`;
    };

    const onMove = (e: PointerEvent) => {
      const b = st.getBoundingClientRect();
      ptr.sx = e.clientX - b.left;
      ptr.sy = e.clientY - b.top;
      ptr.over = true;
      if (e.pointerType === 'mouse') {
        ptr.tx = (ptr.sx / b.width) * 2 - 1;
        ptr.ty = (ptr.sy / b.height) * 2 - 1;
      }
      const sEl = spotOf(e.target);
      const id = sEl?.dataset.spot ?? null;
      setSpot((cur) => (cur === id ? cur : id));
      st.dataset.hover = id ?? '';
      if (id) placeTip(ptr.sx, ptr.sy, b);
      if (id === 'blossom' && performance.now() - lastPetal > 45) {
        lastPetal = performance.now();
        const w = toWorld(ptr.sx, ptr.sy, 0.68);
        addPetal(w.x, w.y, 0.68, 30);
      }
      const w = toWorld(ptr.sx, ptr.sy, 0.42);
      if ((id === 'water' || id === 'alps' || !sEl) && w.y > 618 && w.y < 790 && (rings.length === 0 || rings[rings.length - 1].t > 0.3)) rings.push({ x: w.x, y: w.y, t: 0 });
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
      const sEl = spotOf(e.target);
      if (!sEl) return;
      const id = sEl.dataset.spot!;
      const b = st.getBoundingClientRect();
      ptr.sx = e.clientX - b.left;
      ptr.sy = e.clientY - b.top;
      setSpot(id);
      st.dataset.hover = id;
      placeTip(ptr.sx, ptr.sy, b, true);
      track('hero_spot_touched', { spot: id });
      if (id === 'blossom') {
        const w = toWorld(ptr.sx, ptr.sy, 0.68);
        for (let i = 0; i < 18; i++) addPetal(w.x + rand(-30, 30), w.y + rand(-20, 20), 0.68, 40);
      }
      sEl.classList.add('is-touched');
      setTimeout(() => sEl.classList.remove('is-touched'), 1600);
      wake();
    };
    const onClick = (e: MouseEvent) => {
      const sEl = spotOf(e.target);
      if (!sEl || !matchMedia('(hover: hover)').matches) return;
      const spt = SPOTS[sEl.dataset.spot!];
      if (spt?.slug) onPickRef.current?.(spt.slug);
    };

    /* ------------------------------ lifecycle ------------------------------ */
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      wake();
    });
    io.observe(st);
    const ro = new ResizeObserver(() => {
      size();
      wake();
    });
    ro.observe(st);
    const onScroll = () => wake();
    st.addEventListener('pointermove', onMove);
    st.addEventListener('pointerleave', onLeave);
    st.addEventListener('pointerdown', onDown);
    st.addEventListener('click', onClick);
    window.addEventListener('scroll', onScroll, { passive: true });
    applyCamera(0);
    wake();

    return () => {
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      st.removeEventListener('pointermove', onMove);
      st.removeEventListener('pointerleave', onLeave);
      st.removeEventListener('pointerdown', onDown);
      st.removeEventListener('click', onClick);
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
      <div ref={stage} className={`culture-stage ${revealed ? 'is-revealed' : ''}`}>
        <svg ref={svg} className="culture-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label="An illustrated world at dusk: sky lanterns rising over a bridge, tea under cherry blossoms, the Matterhorn glowing pink above a misty alpine lake, a pagoda and a palace on the skyline.">
          <g ref={cam}>
            <CultureWorld />
          </g>
        </svg>
        <canvas ref={cv} aria-hidden className="culture-canvas" />
        <div aria-hidden className="culture-dusk" />
        <div aria-hidden className="culture-paper" />
        <div aria-hidden className="culture-mist" />

        {/* before the journey: a quiet invitation to scroll */}
        <div className="culture-start" aria-hidden={revealed}>
          <p className="culture-intro">Passport Stories Presents</p>
          <p className="culture-start-cue">
            <span className="culture-start-line" aria-hidden />
            Scroll to begin the journey
          </p>
        </div>

        {/* the words, once the whole world is in view */}
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
              {info.slug && (
                <button
                  type="button"
                  className="culture-tip-go"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPick?.(info.slug!);
                  }}
                >
                  Find it on the globe →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
