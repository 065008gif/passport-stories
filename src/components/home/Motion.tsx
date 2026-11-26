'use client';

/**
 * Home page motion: Lenis smooth scroll driven by the GSAP ticker, word-by-word
 * headline reveals, staggered reveals, gentle parallax, mouse-reactive layers
 * and the pinned sideways country journey. Everything is skipped under
 * prefers-reduced-motion, and the content is fully visible without JS.
 */
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function Motion() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let cleanup = () => {};
    let alive = true;
    (async () => {
      const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger'), import('lenis')]);
      if (!alive) return;
      gsap.registerPlugin(ScrollTrigger);
      const root = document.documentElement;
      root.classList.add('has-motion');

      const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.9, anchors: { offset: -80 } });
      lenis.on('scroll', ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      const ctx = gsap.context(() => {
        // Headlines: word by word through a mask.
        gsap.utils.toArray<HTMLElement>('[data-split]').forEach((el) => {
          if (!el.dataset.splitDone) {
            const text = el.textContent || '';
            el.setAttribute('aria-label', text.trim());
            const html = el.innerHTML;
            // Split only plain text nodes; keep <em> etc. as single units.
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            const out: string[] = [];
            tmp.childNodes.forEach((n) => {
              if (n.nodeType === 3) {
                (n.textContent || '').split(/(\s+)/).forEach((w) => {
                  if (!w.trim()) out.push(w);
                  else out.push(`<span class="mw-mask" aria-hidden="true"><span class="mw">${w}</span></span>`);
                });
              } else {
                out.push(`<span class="mw-mask" aria-hidden="true"><span class="mw">${(n as HTMLElement).outerHTML}</span></span>`);
              }
            });
            el.innerHTML = out.join('');
            el.dataset.splitDone = '1';
          }
          gsap.fromTo(
            el.querySelectorAll('.mw'),
            { yPercent: 110, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 1, ease: 'power4.out', stagger: 0.06, delay: el.dataset.split === 'hero' ? 0.25 : 0, scrollTrigger: el.dataset.split === 'hero' ? undefined : { trigger: el, start: 'top 85%', once: true } },
          );
        });

        // Groups that rise in, one after another.
        gsap.utils.toArray<HTMLElement>('[data-rise]').forEach((group) => {
          gsap.fromTo(group.querySelectorAll('[data-rise-item]'), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.09, scrollTrigger: { trigger: group, start: 'top 82%', once: true } });
        });

        // Parallax layers.
        gsap.utils.toArray<HTMLElement>('[data-speed]').forEach((layer) => {
          const speed = Number(layer.dataset.speed || 0.15);
          gsap.to(layer, { yPercent: -speed * 100, ease: 'none', scrollTrigger: { trigger: layer.closest('section') || layer, start: 'top bottom', end: 'bottom top', scrub: 1.1 } });
        });

        // Pinned sideways journey through the countries (laptops and up).
        const mm = gsap.matchMedia();
        mm.add('(min-width: 1024px)', () => {
          const section = document.querySelector<HTMLElement>('[data-journey]');
          const track = section?.querySelector<HTMLElement>('[data-journey-track]');
          if (!section || !track) return;
          const distance = () => track.scrollWidth - window.innerWidth;
          const tween = gsap.to(track, {
            x: () => -distance(),
            ease: 'none',
            scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${distance()}`, pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true },
          });
          const bar = section.querySelector<HTMLElement>('[data-journey-bar]');
          if (bar) gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${distance()}`, scrub: true } });
          // Each panel's scene drifts a little against the scroll for depth.
          track.querySelectorAll<HTMLElement>('[data-drift]').forEach((art) => {
            gsap.fromTo(art, { xPercent: 8 }, { xPercent: -8, ease: 'none', scrollTrigger: { trigger: art, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
          });
        });
      });

      // Mouse-reactive layers (pointer devices only).
      const fine = window.matchMedia('(pointer: fine)').matches;
      const offs: (() => void)[] = [];
      if (fine) {
        document.querySelectorAll<HTMLElement>('[data-mouse]').forEach((section) => {
          const layers = Array.from(section.querySelectorAll<HTMLElement>('[data-depth]')).map((l) => ({
            d: Number(l.dataset.depth || 0.03),
            x: gsap.quickTo(l, 'x', { duration: 0.9, ease: 'power3.out' }),
            y: gsap.quickTo(l, 'y', { duration: 0.9, ease: 'power3.out' }),
          }));
          const move = (e: PointerEvent) => {
            const r = section.getBoundingClientRect();
            const dx = e.clientX - r.left - r.width / 2;
            const dy = e.clientY - r.top - r.height / 2;
            layers.forEach((l) => {
              l.x(dx * l.d);
              l.y(dy * l.d);
            });
          };
          const leave = () => layers.forEach((l) => (l.x(0), l.y(0)));
          section.addEventListener('pointermove', move);
          section.addEventListener('pointerleave', leave);
          offs.push(() => {
            section.removeEventListener('pointermove', move);
            section.removeEventListener('pointerleave', leave);
          });
        });
      }

      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener('load', refresh);
      document.fonts?.ready.then(refresh);

      cleanup = () => {
        offs.forEach((f) => f());
        window.removeEventListener('load', refresh);
        ctx.revert();
        gsap.ticker.remove(tick);
        lenis.destroy();
        root.classList.remove('has-motion');
      };
    })();
    return () => {
      alive = false;
      cleanup();
    };
  }, [pathname]);
  return null;
}
