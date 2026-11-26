'use client';

/**
 * HERO: the world, orbiting.
 *
 *  - Background: a live mesh gradient (WebGL) in coral, orange, sunshine,
 *    turquoise, sky and pink, flowing slowly.
 *  - A 3D ring of real photos and live clips from around the world circles
 *    the headline. Drag to spin it; it tilts with the pointer.
 *  - 3D travel objects (Icons8, "3D Casual Life") float at different depths,
 *    and a plane flies its own lap around the ring.
 *  - Scrolling away opens the ring up and fades it, like a camera pulling back.
 *
 * Reduced motion: still gradient, still ring, nothing moves on its own.
 */
import { useEffect, useRef } from 'react';
import { flagSrc } from '@/components/Flag';
import LiveMedia from '@/components/home/LiveMedia';
import { PLACES, MOMENTS, pexels } from '@/data/places';
import { COUNTRY_CLIPS } from '@/data/media';

type Item = { key: string; flag: string; label: string; photo?: number; alt?: string; clip?: keyof typeof COUNTRY_CLIPS };

const p = (slug: string): Item => ({ key: slug, flag: slug, label: PLACES[slug].spot, photo: PLACES[slug].photo, alt: PLACES[slug].alt });

const RING: Item[] = [
  p('japan'),
  { key: 'holi', flag: 'india', label: 'Holi', photo: MOMENTS.holi.photo, alt: MOMENTS.holi.alt },
  p('italy'),
  p('egypt'),
  { key: 'tokyo', flag: 'japan', label: 'Shibuya', clip: 'japan' },
  p('mexico'),
  p('india'),
  p('canada'),
  { key: 'hawker', flag: 'singapore', label: 'Hawker stall', photo: MOMENTS.hawker.photo, alt: MOMENTS.hawker.alt },
  { key: 'market', flag: 'india', label: 'Street market', clip: 'india' },
  p('united-kingdom'),
  p('australia'),
];

const OBJECTS = [
  { src: '/hero3d/balloons.webp', cls: 'obj-balloons', d: 1.3 },
  { src: '/hero3d/suitcase.webp', cls: 'obj-suitcase', d: 1.1 },
  { src: '/hero3d/camera.webp', cls: 'obj-camera', d: 0.9 },
  { src: '/hero3d/pin.webp', cls: 'obj-pin', d: 0.7 },
];

/* ---------------------------- Mesh gradient ---------------------------- */
const FRAG = `precision highp float;
uniform vec2 uR; uniform float uT; uniform vec2 uM;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a*n(p); p *= 2.02; a *= 0.5; } return v; }
vec3 blob(vec2 q, vec2 c, vec3 col, float s, inout float w){ float k = exp(-dot(q-c, q-c) / s); w += k; return col * k; }
void main(){
  vec2 uv = gl_FragCoord.xy / uR; float asp = uR.x / uR.y;
  vec2 q = vec2(uv.x * asp, uv.y);
  float t = uT * 0.07;
  q += 0.22 * vec2(fbm(q*1.6 + t), fbm(q*1.6 - t + 4.0)) - 0.11;
  vec2 m = uM * 0.06;
  float w = 0.0; vec3 c = vec3(0.0);
  c += blob(q, vec2(0.12*asp + 0.10*sin(t*1.3), 0.86 + 0.08*cos(t)), vec3(1.0, 0.36, 0.38), 0.10, w);
  c += blob(q, vec2(0.52*asp + 0.12*cos(t*0.9) + m.x, 0.96), vec3(1.0, 0.60, 0.20), 0.09, w);
  c += blob(q, vec2(0.90*asp + 0.08*sin(t*1.1), 0.80 + 0.1*sin(t*0.7)), vec3(1.0, 0.80, 0.20), 0.10, w);
  c += blob(q, vec2(0.08*asp + 0.10*cos(t*0.8), 0.16 + 0.08*sin(t*1.2)), vec3(0.05, 0.76, 0.70), 0.11, w);
  c += blob(q, vec2(0.60*asp + 0.14*sin(t*0.6) - m.x, 0.06 + m.y), vec3(0.12, 0.58, 0.95), 0.12, w);
  c += blob(q, vec2(0.94*asp + 0.06*cos(t*1.4), 0.28 + 0.1*cos(t*0.9)), vec3(1.0, 0.42, 0.64), 0.08, w);
  c += blob(q, vec2(0.45*asp + 0.1*sin(t*0.5), 0.50 + 0.06*cos(t*1.1)), vec3(1.0, 0.52, 0.38), 0.06, w);
  vec3 col = c / max(w, 1e-4);
  col += (h(gl_FragCoord.xy + fract(uT)) - 0.5) * 0.03;
  gl_FragColor = vec4(col, 1.0);
}`;

function startGradient(canvas: HTMLCanvasElement, reduce: boolean, pointer: { x: number; y: number }) {
  const gl = canvas.getContext('webgl', { antialias: false });
  if (!gl) return () => {};
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }'));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return () => {};
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(prog, 'uR');
  const uT = gl.getUniformLocation(prog, 'uT');
  const uM = gl.getUniformLocation(prog, 'uM');
  let raf = 0;
  let on = true;
  const size = () => {
    // Half resolution: it is a soft gradient, and it keeps phones cool.
    canvas.width = Math.max(2, Math.round(canvas.clientWidth * 0.5));
    canvas.height = Math.max(2, Math.round(canvas.clientHeight * 0.5));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  size();
  const t0 = performance.now() - 20000;
  const draw = (now: number) => {
    raf = 0;
    gl.uniform2f(uR, canvas.width, canvas.height);
    gl.uniform1f(uT, (now - t0) / 1000);
    gl.uniform2f(uM, pointer.x, pointer.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.classList.add('is-on');
    if (on && !reduce) raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  const ro = new ResizeObserver(() => {
    size();
    if (!raf) raf = requestAnimationFrame(draw);
  });
  ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => {
    on = e.isIntersecting;
    if (on && !raf && !reduce) raf = requestAnimationFrame(draw);
  });
  io.observe(canvas);
  return () => {
    on = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
  };
}

/* ------------------------------- Hero ------------------------------- */
export default function HeroCollage({ headline, tagline }: { headline: React.ReactNode; tagline: string }) {
  const root = useRef<HTMLElement>(null);
  const bg = useRef<HTMLCanvasElement>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const plane = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: 0, y: 0 };
    const stopBg = bg.current ? startGradient(bg.current, reduce, pointer) : () => {};

    const N = RING.length;
    const phoneStep = () => (el.clientWidth < 768 ? 2 : 1);
    const IDLE = reduce ? 0 : 0.11;
    const st = { a: 0.35, v: IDLE, drag: false, lastX: 0, tx: 0, ty: 0, px: 0, py: 0, sp: 0 };
    let raf = 0;
    let last = performance.now();
    let visible = true;

    const layout = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const W = el.clientWidth;
      const H = el.clientHeight;
      const phone = W < 768;
      const r = el.getBoundingClientRect();
      const s = Math.min(1, Math.max(0, -r.top / Math.max(1, H * 0.8)));
      st.sp += (s - st.sp) * 0.15;
      if (!st.drag) {
        st.v += (IDLE - st.v) * Math.min(1, dt * 1.2);
        st.a += st.v * dt;
      }
      st.px += (st.tx - st.px) * 0.06;
      st.py += (st.ty - st.py) * 0.06;
      pointer.x = st.px;
      pointer.y = st.py;

      const open = 1 + st.sp * 0.9;
      const Rx = (phone ? W * 0.5 : Math.min(W * 0.45, 760)) * open;
      const Rz = (phone ? 200 : 300) * open;
      const Ry = H * (phone ? 0.31 : 0.3) * (1 + st.py * 0.12);
      const cy = -H * 0.03;
      const fade = 1 - st.sp * 1.1;

      for (let i = 0; i < N; i++) {
        const c = cards.current[i];
        if (!c) continue;
        const step = phoneStep();
        if (i % step) continue;
        const th = st.a + (i / N) * Math.PI * 2;
        const sin = Math.sin(th);
        const cos = Math.cos(th);
        const x = sin * Rx;
        const z = cos * Rz;
        const y = cy + cos * Ry;
        const front = (cos + 1) / 2; // 0 back, 1 front
        c.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${(sin * -34).toFixed(2)}deg) rotateZ(${(sin * 5).toFixed(2)}deg)`;
        c.style.opacity = String(Math.max(0, (0.62 + front * 0.38) * fade));
        c.style.zIndex = String(Math.round(z + 2000));
      }

      // The plane flies its own lap, a little faster and higher.
      const pl = plane.current;
      if (pl) {
        const th = st.a * 1.7 + 1.2;
        const sin = Math.sin(th);
        const cos = Math.cos(th);
        const x = sin * Rx * 0.9;
        const z = cos * Rz * 1.15;
        const y = cy + cos * Ry * 0.35 - H * 0.16;
        const right = cos > 0; // flying right in front, left at the back
        pl.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) scaleX(${right ? 1 : -1}) rotate(${(sin * 14).toFixed(2)}deg)`;
        pl.style.zIndex = String(Math.round(z + 2000));
        pl.style.opacity = String(Math.max(0, fade));
      }

      el.style.setProperty('--px', st.px.toFixed(4));
      el.style.setProperty('--py', st.py.toFixed(4));
      el.style.setProperty('--sp', st.sp.toFixed(4));
      if (visible) raf = requestAnimationFrame(layout);
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      st.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      st.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (st.drag) {
        const dx = e.clientX - st.lastX;
        st.lastX = e.clientX;
        st.a += dx * 0.004;
        st.v = Math.max(-2, Math.min(2, dx * 0.2));
      }
    };
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('a, button')) return;
      st.drag = true;
      st.lastX = e.clientX;
    };
    const onUp = () => {
      st.drag = false;
    };
    const onLeave = () => {
      st.tx = 0;
      st.ty = 0;
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(layout);
      }
    });
    io.observe(el);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(layout);
    return () => {
      stopBg();
      io.disconnect();
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <section ref={root} className="hero-orbit relative isolate overflow-hidden" aria-labelledby="hero-title">
      <div aria-hidden className="hero-orbit-fallback absolute inset-0 -z-30" />
      <canvas ref={bg} aria-hidden className="hero-orbit-canvas absolute inset-0 -z-20 h-full w-full" />
      <div aria-hidden className="hero-orbit-grain absolute inset-0 -z-10" />

      {/* Floating 3D objects */}
      {OBJECTS.map((o) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={o.cls} src={o.src} alt="" aria-hidden draggable={false} className={`hero-obj ${o.cls}`} style={{ '--d': o.d } as React.CSSProperties} />
      ))}

      {/* The 3D ring */}
      <div className="hero-orbit-stage absolute inset-0">
        <div className="hero-orbit-world">
          {RING.map((it, i) => (
            <figure
              key={it.key}
              ref={(n) => {
                cards.current[i] = n;
              }}
              className="orbit-card"
            >
              <div className="orbit-photo">
                {it.clip ? (
                  <LiveMedia clip={COUNTRY_CLIPS[it.clip]} className="absolute inset-0" eager={i < 6} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pexels(it.photo!, 480)} alt={it.alt} loading={i < 8 ? 'eager' : 'lazy'} decoding="async" draggable={false} />
                )}
              </div>
              <figcaption className="orbit-tag">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagSrc(it.flag)} alt="" width={16} height={16} />
                {it.label}
              </figcaption>
            </figure>
          ))}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={plane} src="/hero3d/plane.webp" alt="" aria-hidden draggable={false} className="orbit-plane" />
        </div>
      </div>

      {/* The words */}
      <div className="hero-orbit-copy pointer-events-none relative z-[2000] mx-auto flex min-h-[max(40rem,calc(100svh-var(--header)))] max-w-[54rem] flex-col items-center justify-center px-5 pb-[7vh] text-center">
        <h1 id="hero-title" className="hero-orbit-title h-display text-[3rem] leading-[0.95] text-white sm:text-7xl lg:text-[6.4rem]">
          {headline}
        </h1>
        <p className="hero-orbit-tagline mt-5 max-w-[34rem] text-[1.05rem] font-semibold leading-relaxed text-white sm:text-xl">{tagline}</p>
      </div>

    </section>
  );
}
