/**
 * HeroTunnelScene: the sunlit 3D postcard flight tunnel behind the hero.
 *
 *   - a daylight sky dome (GLSL): ivory, peach, coral, sunshine, sky and
 *     turquoise, drifting clouds, a sun bloom, tinted by the focused country
 *   - a soft full-bleed scenic photo plane that cross-fades per country
 *   - curved photo and video postcards on a spiral tunnel receding in Z
 *   - a glossy miniature jet with a fading ribbon contrail
 *   - sunlit dust motes and faint golden latitude arcs
 *
 * The React shell (HeroCollage.tsx) owns the DOM, GSAP and scrolling. It
 * feeds pointer input in and reads focus changes out. Every value that moves
 * goes through a spring or a damped velocity, so input is never snapped.
 */
import * as THREE from 'three';

export type Tone = 'coral' | 'tang' | 'sun' | 'teal' | 'sky';

export interface TunnelCard {
  key: string;
  slug: string;
  label: string;
  image: string;
  /** Muted looping clip, used on laptops only; the image is its poster. */
  video?: string;
  shape: 'tall' | 'wide';
  tone: Tone;
}

/** Driven by the GSAP scroll timeline. */
export interface Flight {
  camZ: number;
  bank: number;
  dive: number;
}

const DEG = Math.PI / 180;
const FOV = 50;
export const REST_Z = 6;
/** How close a focused postcard comes: in front of the nearest card in the tunnel. */
const LEAP_Z = 2.6;

/* sRGB hex -> linear rgb, so colours never depend on THREE.ColorManagement */
function lin(hex: number): [number, number, number] {
  const c = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return [c[0], c[1], c[2]];
}
const v3 = (hex: number) => new THREE.Vector3(...lin(hex));
const col = (hex: number) => new THREE.Color().setRGB(...lin(hex), THREE.LinearSRGBColorSpace);

const PAL = {
  ivory: 0xfff8ef,
  peach: 0xffe3d3,
  coral: 0xff6b5b,
  tang: 0xff8a4c,
  sun: 0xffc233,
  sky: 0x1aa3cf,
  teal: 0x12b5a6,
  frame: 0xfffbf3,
};
const TONE: Record<Tone, number> = { coral: PAL.coral, tang: PAL.tang, sun: PAL.sun, teal: PAL.teal, sky: PAL.sky };

/* A damped spring: semi-implicit Euler, stable at any frame rate we allow. */
type Spring = { x: number; v: number };
function step(s: Spring, target: number, k: number, c: number, dt: number) {
  s.v += ((target - s.x) * k - s.v * c) * dt;
  s.x += s.v * dt;
}

/* ------------------------------ Shaders ------------------------------ */
const NOISE = `
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*vnoise(p); p = p*2.03 + 7.1; a *= 0.5; } return v; }`;

const SKY_VERT = `varying vec3 vDir;
void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const SKY_FRAG = `uniform float uTime; uniform vec3 uAccent; uniform float uAccentAmt;
uniform vec3 uIvory; uniform vec3 uPeach; uniform vec3 uCoral; uniform vec3 uSun; uniform vec3 uSky; uniform vec3 uTeal;
varying vec3 vDir;
${NOISE}
void main(){
  vec3 d = normalize(vDir);
  float y = clamp(d.y / 0.5, -1.4, 1.4); // the visible sky spans about +-0.45 in y
  // Warm crown, deep clear sky through the middle (where the white words sit), turquoise into an ivory haze below.
  vec3 crown = mix(uCoral, uSun, smoothstep(-0.7, 0.6, d.x));
  vec3 mid = mix(uSky * 0.86, uTeal * 0.9, smoothstep(0.1, -0.8, d.x) * 0.55);
  vec3 low = mix(uTeal, uIvory, smoothstep(-0.25, -0.75, y));
  vec3 c = y > 0.0 ? mix(mid, crown, smoothstep(0.18, 0.95, y)) : mix(mid, low, smoothstep(-0.1, -1.0, y));
  c = mix(c, uPeach, smoothstep(0.85, 1.3, y) * 0.3);
  // The country's colour washes in when a postcard is focused.
  c = mix(c, mix(c, uAccent, 0.5), uAccentAmt * (1.0 - smoothstep(0.55, 1.0, abs(y))));
  // Slow sunlit clouds.
  vec2 cuv = d.xy / (abs(d.z) + 0.55) * 1.4 + vec2(uTime * 0.012, uTime * 0.004);
  float cl = fbm(cuv * 1.3);
  float cloud = smoothstep(0.55, 0.88, cl) * smoothstep(-0.5, 0.35, y) * 0.5;
  c = mix(c, mix(uIvory, uPeach, 0.25) * 1.08, cloud);
  // Sun bloom up and to the right, and a soft warm glow down the corridor.
  vec3 sunDir = normalize(vec3(0.62, 0.5, -0.6));
  float s = max(dot(d, sunDir), 0.0);
  c += mix(uSun, uIvory, 0.5) * (pow(s, 7.0) * 0.55 + pow(s, 80.0) * 1.4);
  c += uPeach * pow(max(-d.z, 0.0), 26.0) * 0.12;
  // ACES pulls saturation out of bright colour; push it back in first.
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = max(mix(vec3(lum), c, 1.35), 0.0);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const BACKDROP_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const BACKDROP_FRAG = `uniform sampler2D uA; uniform sampler2D uB; uniform float uMix; uniform float uOpacity;
uniform float uAspA; uniform float uAspB; uniform float uBox; uniform float uHasA; uniform float uHasB;
varying vec2 vUv;
vec2 cover(vec2 uv, float img){ vec2 s = uBox > img ? vec2(1.0, img / uBox) : vec2(uBox / img, 1.0); return (uv - 0.5) * s + 0.5; }
vec3 soft(sampler2D t, vec2 uv){
  // Sample low in the mip chain: a smooth, wide blur for the price of five taps.
  float r = 0.012;
  vec3 c = texture2D(t, uv, 4.5).rgb * 2.0;
  c += texture2D(t, uv + vec2(r, 0.0), 4.5).rgb + texture2D(t, uv - vec2(r, 0.0), 4.5).rgb;
  c += texture2D(t, uv + vec2(0.0, r), 4.5).rgb + texture2D(t, uv - vec2(0.0, r), 4.5).rgb;
  return c / 6.0;
}
void main(){
  vec3 a = soft(uA, cover(vUv, uAspA));
  vec3 b = soft(uB, cover(vUv, uAspB));
  float m = uHasB > 0.5 ? uMix : 0.0;
  vec3 c = mix(a, b, m);
  // Sun drenched grade: lift, warm, never muddy.
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, 1.5);
  c = c * 0.72 + 0.26;
  c *= vec3(1.06, 1.0, 0.94);
  float alpha = uOpacity * (uHasA > 0.5 || m > 0.0 ? 1.0 : 0.0);
  gl_FragColor = vec4(c, alpha);
  #include <colorspace_fragment>
}`;

const CARD_VERT = `uniform float uBend; uniform vec2 uSize; varying vec2 vP;
void main(){
  vP = position.xy;
  vec3 p = position;
  float nx = p.x / (uSize.x * 0.5);
  p.z -= uBend * nx * nx * uSize.x * 0.5;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const CARD_FRAG = `uniform sampler2D uMap; uniform vec2 uSize; uniform float uImg; uniform float uHas; uniform float uOpacity;
uniform float uFrame; uniform float uRadius; uniform vec3 uFrameCol; uniform vec3 uBlank; uniform float uGlow;
varying vec2 vP;
float sdr(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main(){
  vec2 hs = uSize * 0.5;
  float d = sdr(vP, hs, uRadius);
  float aa = fwidth(d) * 1.2;
  float alpha = 1.0 - smoothstep(-aa, aa, d);
  vec2 inner = hs - vec2(uFrame);
  float di = sdr(vP, inner, max(uRadius - uFrame, 0.004));
  float inside = 1.0 - smoothstep(-aa, aa, di);
  vec2 iuv = (vP + inner) / (2.0 * inner);
  float box = inner.x / inner.y;
  vec2 s = box > uImg ? vec2(1.0, uImg / box) : vec2(box / uImg, 1.0);
  vec3 photo = uHas > 0.5 ? texture2D(uMap, (iuv - 0.5) * s + 0.5).rgb : uBlank;
  // A hairline at the photo edge, so it sits in the frame instead of floating on it.
  photo *= 1.0 - (smoothstep(-aa * 2.5, 0.0, di) * inside) * 0.18;
  vec3 c = mix(uFrameCol, photo, inside);
  c += uGlow * 0.06;
  gl_FragColor = vec4(c, alpha * uOpacity);
  #include <colorspace_fragment>
}`;

const SHADOW_FRAG = `uniform vec2 uSize; uniform float uOpacity; uniform vec3 uTint; varying vec2 vP;
float sdr(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main(){
  float d = sdr(vP, uSize * 0.42, 0.12);
  float a = (1.0 - smoothstep(-0.12, 0.26, d)) * 0.26 * uOpacity;
  gl_FragColor = vec4(uTint, a);
  #include <colorspace_fragment>
}`;

const TRAIL_VERT = `attribute float aFade; varying float vFade; void main(){ vFade = aFade; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const TRAIL_FRAG = `uniform vec3 uCol; uniform float uOpacity; varying float vFade;
void main(){ gl_FragColor = vec4(uCol, vFade * uOpacity);
  #include <colorspace_fragment>
}`;

const DUST_VERT = `attribute float aSeed; uniform float uTime; uniform float uSize; varying float vA;
void main(){
  vec3 p = position;
  p.x += sin(uTime * 0.21 + aSeed * 40.0) * 0.35;
  p.y += cos(uTime * 0.17 + aSeed * 25.0) * 0.28 + uTime * 0.03 * (aSeed - 0.5);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (0.45 + aSeed * 0.8) * (6.0 / max(0.4, -mv.z));
  vA = (0.45 + 0.55 * sin(uTime * 1.3 + aSeed * 60.0) * 0.5 + 0.25) * smoothstep(0.2, 2.0, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const DUST_FRAG = `uniform vec3 uCol; varying float vA;
void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uCol, a * a * vA * 0.9);
  #include <colorspace_fragment>
}`;

/* ------------------------------ The scene ------------------------------ */
interface CardState {
  data: TunnelCard;
  group: THREE.Group;
  mesh: THREE.Mesh;
  /** Invisible stand-in that stays in the card's resting slot, so hover never jitters. */
  proxy: THREE.Mesh;
  shadow: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  shadowMat: THREE.ShaderMaterial;
  size: THREE.Vector2;
  tex: THREE.Texture | null;
  aspect: number;
  video?: HTMLVideoElement;
  theta: number;
  z: number;
  jitter: number;
  roll: number;
  burst: { b: number };
  focus: Spring;
  recede: Spring;
  tiltX: Spring;
  tiltY: Spring;
}

const TRAIL = 56;

export class HeroTunnelScene {
  readonly flight: Flight;
  /** 0..1 burst progress for each card, tweened by the shell (GSAP). */
  readonly bursts: { b: number }[] = [];
  onFocus: (i: number | null) => void = () => {};
  /** Keep the current card focused while the pointer is on its HTML tag. */
  holdFocus = false;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 220);
  private sky: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private backdrop: THREE.Mesh;
  private backMat: THREE.ShaderMaterial;
  private cards: CardState[] = [];
  private plane = new THREE.Group();
  private trailGeo = new THREE.BufferGeometry();
  private trailMat!: THREE.ShaderMaterial;
  private trailPts: THREE.Vector3[] = [];
  private dustMat!: THREE.ShaderMaterial;
  private arcs: THREE.Line[] = [];
  private loader = new THREE.TextureLoader();
  private ray = new THREE.Raycaster();
  private proxyMat = new THREE.MeshBasicMaterial({ visible: false });
  private ndc = new THREE.Vector2(-9, -9);
  private maxAniso = 1;
  private w = 1;
  private h = 1;
  private phone = false;
  private reduce: boolean;
  private time = 0;
  private raf = 0;
  private last = 0;
  private running = false;
  private disposed = false;

  // input
  private pointer = { x: 0, y: 0, inside: false, type: 'mouse' };
  private cam = { x: { x: 0, v: 0 } as Spring, y: { x: 0, v: 0 } as Spring, roll: { x: 0, v: 0 } as Spring };
  private spin = { a: 0, v: 0, dragging: false, lastX: 0, lastT: 0, downX: 0, downY: 0, moved: 0 };
  private focused: number | null = null;
  private accent = { cur: new THREE.Vector3(), amt: { x: 0, v: 0 } as Spring };
  private planeState = { pos: new THREE.Vector3(0, 0.9, 2.6), vel: new THREE.Vector3(), follow: new THREE.Vector3(), t: 0, bank: { x: 0, v: 0 } as Spring };
  private tagEl: HTMLElement | null = null;
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private tmpM = new THREE.Matrix4();
  private origin = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);
  private trailMesh!: THREE.Mesh;

  constructor(canvas: HTMLCanvasElement, cards: TunnelCard[], opts: { phone: boolean; reduce: boolean; heroImage: string; flight: Flight }) {
    this.flight = opts.flight;
    this.phone = opts.phone;
    this.reduce = opts.reduce;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.32;
    this.maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.camera.position.set(0, 0, REST_Z);
    this.scene.add(this.camera);

    /* Sky dome: follows the camera, so it is always infinitely far away. */
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uAccent: { value: v3(PAL.sun) },
        uAccentAmt: { value: 0 },
        uIvory: { value: v3(PAL.ivory) },
        uPeach: { value: v3(PAL.peach) },
        uCoral: { value: v3(PAL.coral) },
        uSun: { value: v3(PAL.sun) },
        uSky: { value: v3(PAL.sky) },
        uTeal: { value: v3(PAL.teal) },
      },
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(100, 48, 32), this.skyMat);
    this.sky.renderOrder = -2;
    this.scene.add(this.sky);

    /* Full bleed scenic photo, parented to the camera. */
    this.backMat = new THREE.ShaderMaterial({
      vertexShader: BACKDROP_VERT,
      fragmentShader: BACKDROP_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      uniforms: {
        uA: { value: null },
        uB: { value: null },
        uMix: { value: 0 },
        uOpacity: { value: 0 },
        uAspA: { value: 1.5 },
        uAspB: { value: 1.5 },
        uBox: { value: 1.6 },
        uHasA: { value: 0 },
        uHasB: { value: 0 },
      },
    });
    this.backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.backMat);
    this.backdrop.renderOrder = -1;
    this.backdrop.position.z = -60;
    this.camera.add(this.backdrop);
    this.loadTexture(opts.heroImage, (t, a) => {
      this.backMat.uniforms.uA.value = t;
      this.backMat.uniforms.uAspA.value = a;
      this.backMat.uniforms.uHasA.value = 1;
    });

    /* Light for the jet. */
    const hemi = new THREE.HemisphereLight(col(0xbfe9ff), col(PAL.peach), 1.5);
    const sun = new THREE.DirectionalLight(col(0xfff1d6), 3.2);
    sun.position.set(4, 5, 4);
    this.scene.add(hemi, sun);

    this.buildCards(cards);
    this.buildPlane();
    this.buildTrail();
    this.dustMat = this.buildDust();
    this.buildArcs();
  }

  /* ------------------------------ Builders ------------------------------ */
  private loadTexture(url: string, done: (t: THREE.Texture, aspect: number) => void) {
    this.loader.setCrossOrigin('anonymous');
    this.loader.load(url, (t) => {
      if (this.disposed) return t.dispose();
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = this.maxAniso;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.generateMipmaps = true;
      t.needsUpdate = true;
      const img = t.image as { width: number; height: number };
      done(t, img.width / img.height);
    });
  }

  private buildCards(list: TunnelCard[]) {
    const n = list.length;
    const frameCol = v3(PAL.frame);
    const blank = v3(PAL.peach);
    const shadowTint = v3(0x7a3420);
    list.forEach((data, i) => {
      const size = data.shape === 'tall' ? new THREE.Vector2(1.2, 1.6) : new THREE.Vector2(1.76, 1.1);
      const geo = new THREE.PlaneGeometry(size.x, size.y, 20, 12);
      const mat = new THREE.ShaderMaterial({
        vertexShader: CARD_VERT,
        fragmentShader: CARD_FRAG,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uMap: { value: null },
          uSize: { value: size },
          uImg: { value: 1.4 },
          uHas: { value: 0 },
          uOpacity: { value: 0 },
          uBend: { value: 0.12 },
          uFrame: { value: 0.055 },
          uRadius: { value: 0.09 },
          uFrameCol: { value: frameCol },
          uBlank: { value: blank },
          uGlow: { value: 0 },
        },
      });
      const shadowMat = new THREE.ShaderMaterial({
        vertexShader: CARD_VERT,
        fragmentShader: SHADOW_FRAG,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: { uSize: { value: size.clone().multiplyScalar(1.18) }, uBend: { value: 0.12 }, uOpacity: { value: 0 }, uTint: { value: shadowTint } },
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.index = i;
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 1.18, size.y * 1.18, 8, 6), shadowMat);
      shadow.position.set(0.05, -0.12, -0.06);
      const group = new THREE.Group();
      group.add(shadow, mesh);
      this.scene.add(group);
      const proxy = new THREE.Mesh(new THREE.PlaneGeometry(size.x, size.y), this.proxyMat);
      proxy.userData.index = i;
      this.scene.add(proxy);
      const burst = { b: this.reduce ? 1 : 0 };
      this.bursts.push(burst);
      const st: CardState = {
        data,
        group,
        mesh,
        proxy,
        shadow,
        mat,
        shadowMat,
        size,
        tex: null,
        aspect: 1.4,
        theta: i * 2.39996 + 0.55,
        z: 1.5 - (i / Math.max(1, n - 1)) * 17.5,
        jitter: 0.9 + ((i * 37) % 10) / 50,
        roll: (((i * 53) % 11) / 11 - 0.5) * 0.16,
        burst,
        focus: { x: 0, v: 0 },
        recede: { x: 0, v: 0 },
        tiltX: { x: 0, v: 0 },
        tiltY: { x: 0, v: 0 },
      };
      this.cards.push(st);
      this.loadTexture(data.image, (t, a) => {
        st.tex = t;
        st.aspect = a;
        if (!st.video || st.mat.uniforms.uHas.value < 0.5) {
          mat.uniforms.uMap.value = t;
          mat.uniforms.uImg.value = a;
          mat.uniforms.uHas.value = 1;
        }
      });
    });
  }

  /** Muted clips on laptops: start after the burst, play only while the hero is on screen. */
  startVideos() {
    if (this.phone || this.reduce) return;
    this.cards.forEach((st) => {
      if (!st.data.video || st.video) return;
      const v = document.createElement('video');
      v.crossOrigin = 'anonymous';
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = 'auto';
      v.src = st.data.video;
      st.video = v;
      v.addEventListener(
        'playing',
        () => {
          if (this.disposed) return;
          const vt = new THREE.VideoTexture(v);
          vt.colorSpace = THREE.SRGBColorSpace;
          vt.anisotropy = this.maxAniso;
          st.mat.uniforms.uMap.value = vt;
          st.mat.uniforms.uImg.value = v.videoWidth / Math.max(1, v.videoHeight);
          st.mat.uniforms.uHas.value = 1;
        },
        { once: true },
      );
      if (this.running) v.play().catch(() => {});
    });
  }

  private buildPlane() {
    const white = new THREE.MeshPhysicalMaterial({ color: col(0xfffaf4), roughness: 0.22, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.4, sheenColor: col(PAL.peach) });
    const coral = new THREE.MeshPhysicalMaterial({ color: col(PAL.coral), roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 });
    const glass = new THREE.MeshPhysicalMaterial({ color: col(0x1f2a44), roughness: 0.08, metalness: 0.2, clearcoat: 1 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.56, 8, 20), white);
    body.rotation.x = Math.PI / 2;
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.086, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), coral);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -0.36;
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 10), glass);
    cockpit.scale.set(1, 0.6, 1.6);
    cockpit.position.set(0, 0.055, -0.2);

    const flat = (pts: [number, number][], depth: number, mat: THREE.Material) => {
      const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
      const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 });
      g.translate(0, 0, -depth / 2);
      return new THREE.Mesh(g, mat);
    };
    // swept wings, lying flat (shape y becomes forward)
    const wing = flat(
      [
        [-0.5, -0.1],
        [-0.48, -0.04],
        [-0.06, 0.12],
        [0.06, 0.12],
        [0.48, -0.04],
        [0.5, -0.1],
        [0, -0.02],
      ],
      0.018,
      coral,
    );
    wing.rotation.x = -Math.PI / 2;
    wing.position.set(0, -0.02, 0.0);
    const stab = flat(
      [
        [-0.2, -0.05],
        [-0.03, 0.05],
        [0.03, 0.05],
        [0.2, -0.05],
        [0, -0.02],
      ],
      0.014,
      white,
    );
    stab.rotation.x = -Math.PI / 2;
    stab.position.set(0, 0.0, 0.3);
    const fin = flat(
      [
        [0, 0],
        [0.13, 0],
        [0.2, 0.19],
        [0.13, 0.19],
      ],
      0.016,
      coral,
    );
    fin.rotation.y = -Math.PI / 2;
    fin.position.set(0, 0.05, 0.2);

    this.plane.add(body, nose, cockpit, wing, stab, fin);
    this.plane.scale.setScalar(this.phone ? 0.36 : 0.72);
    this.scene.add(this.plane);
  }

  private buildTrail() {
    const pos = new Float32Array(TRAIL * 2 * 3);
    const fade = new Float32Array(TRAIL * 2);
    const idx: number[] = [];
    for (let i = 0; i < TRAIL - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.trailGeo.setAttribute('aFade', new THREE.BufferAttribute(fade, 1).setUsage(THREE.DynamicDrawUsage));
    this.trailGeo.setIndex(idx);
    this.trailMat = new THREE.ShaderMaterial({
      vertexShader: TRAIL_VERT,
      fragmentShader: TRAIL_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      uniforms: { uCol: { value: v3(0xfffaf0) }, uOpacity: { value: 0.85 } },
    });
    this.trailMesh = new THREE.Mesh(this.trailGeo, this.trailMat);
    this.trailMesh.frustumCulled = false;
    this.scene.add(this.trailMesh);
  }

  private buildDust() {
    const n = this.phone ? 90 : 170;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r = (k: number) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
      pos.set([(r(1) - 0.5) * 16, (r(2) - 0.5) * 10, 5 - r(3) * 28], i * 3);
      seed[i] = r(4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { uTime: { value: 0 }, uSize: { value: 9 * Math.min(window.devicePixelRatio || 1, 2) }, uCol: { value: v3(0xffd27a) } },
    });
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    pts.renderOrder = 100000;
    this.scene.add(pts);
    return mat;
  }

  private buildArcs() {
    const mat = new THREE.LineBasicMaterial({ color: col(0xffd36b), transparent: true, opacity: 0.38, depthWrite: false, toneMapped: false });
    [-3, -8.5, -14].forEach((z, k) => {
      const dist = REST_Z - z;
      const hh = dist * Math.tan((FOV / 2) * DEG);
      const curve = new THREE.EllipseCurve(0, 0, hh * 1.25, hh * 0.78, Math.PI * (0.1 + k * 0.04), Math.PI * (0.9 - k * 0.03), false, k * 0.2);
      const g = new THREE.BufferGeometry().setFromPoints(curve.getPoints(80));
      const line = new THREE.Line(g, mat);
      line.position.z = z;
      this.arcs.push(line);
      this.scene.add(line);
    });
  }

  /* ------------------------------ Layout ------------------------------ */
  resize(w: number, h: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.phone = w < 768;
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
    const bh = 2 * 60 * Math.tan((FOV / 2) * DEG) * 1.12;
    this.backdrop.scale.set(bh * this.camera.aspect, bh, 1);
    this.backMat.uniforms.uBox.value = this.camera.aspect;
    if (!this.running) this.frame(performance.now(), true);
  }

  /** Where card i lives in the tunnel, before focus and burst. */
  private home(st: CardState, out: THREE.Vector3) {
    const aspect = this.camera.aspect;
    const dist = REST_Z - st.z;
    const hh = dist * Math.tan((FOV / 2) * DEG);
    const hw = hh * aspect;
    const th = st.theta + this.spin.a;
    const cx = Math.cos(th);
    const cy = Math.sin(th);
    let x: number;
    let y: number;
    if (aspect >= 1) {
      // Always outside the headline corridor: the ellipse never enters |x| < .61, |y| < .53 together.
      x = cx * 0.8 * st.jitter;
      y = cy * 0.7 * st.jitter;
    } else {
      x = cx * 0.62 * st.jitter;
      y = cy * 0.74;
      if (Math.abs(y) < 0.4) y = Math.sign(y || 1) * 0.4;
    }
    return out.set(x * hw, y * hh, st.z);
  }

  /* ------------------------------ Input ------------------------------ */
  setTag(el: HTMLElement | null) {
    this.tagEl = el;
  }

  pointerMove(x: number, y: number, type: string) {
    this.pointer.x = (x / this.w) * 2 - 1;
    this.pointer.y = (y / this.h) * 2 - 1;
    this.pointer.inside = true;
    this.pointer.type = type;
    this.ndc.set(this.pointer.x, -this.pointer.y);
    const s = this.spin;
    if (s.dragging) {
      const now = performance.now();
      const dx = x - s.lastX;
      const dt = Math.max(1, now - s.lastT) / 1000;
      s.a += dx * 0.0042;
      s.v = s.v * 0.4 + ((dx * 0.0042) / dt) * 0.6;
      s.moved = Math.max(s.moved, Math.hypot(x - s.downX, y - s.downY));
      s.lastX = x;
      s.lastT = now;
    }
  }
  /** Returns nothing; the shell asks `tap()` on release. */
  pointerDown(x: number, y: number) {
    const s = this.spin;
    s.dragging = true;
    s.lastX = x;
    s.downX = x;
    s.downY = y;
    s.lastT = performance.now();
    s.moved = 0;
    s.v = 0;
    this.pointer.x = (x / this.w) * 2 - 1;
    this.pointer.y = (y / this.h) * 2 - 1;
    this.ndc.set(this.pointer.x, -this.pointer.y);
  }
  /** Ends a drag. Returns the card index under the pointer if this was a tap, else null. */
  pointerUp(cancelled = false): { tap: boolean; hit: number | null } {
    const s = this.spin;
    const wasTap = s.dragging && s.moved < 8 && !cancelled;
    s.dragging = false;
    return { tap: wasTap, hit: wasTap ? this.hit() : null };
  }
  get dragDistance() {
    return this.spin.moved;
  }
  pointerLeave() {
    this.pointer.inside = false;
    this.ndc.set(-9, -9);
    if (!this.holdFocus && this.pointer.type === 'mouse') this.setFocus(null);
  }

  private hit(): number | null {
    this.ray.setFromCamera(this.ndc, this.camera);
    // The focused card wins while the pointer is on it where it now floats...
    let hits: THREE.Intersection[] = [];
    if (this.focused !== null) hits = this.ray.intersectObject(this.cards[this.focused].mesh, false);
    // ...otherwise test every card where it rests, ignoring the leap and the recede.
    if (!hits.length) hits = this.ray.intersectObjects(this.cards.filter((c) => c.burst.b > 0.6 && c.group.visible).map((c) => c.proxy), false);
    if (!hits.length) return null;
    const i = hits[0].object.userData.index as number;
    const uv = hits[0].uv;
    // remembered for the magnetic tilt toward the cursor
    if (uv) (this.cards[i].mesh.userData as { uv?: THREE.Vector2 }).uv = uv.clone();
    return i;
  }

  setFocus(i: number | null) {
    if (i === this.focused) return;
    this.focused = i;
    if (i !== null) {
      const st = this.cards[i];
      const [r, g, b] = lin(TONE[st.data.tone]);
      this.accent.cur.set(r, g, b);
      if (st.tex) this.setBackdrop(st.tex, st.aspect);
    }
    this.onFocus(i);
  }
  get focus() {
    return this.focused;
  }

  private setBackdrop(t: THREE.Texture, aspect: number) {
    const u = this.backMat.uniforms;
    if (u.uB.value === t || (u.uA.value === t && u.uMix.value < 0.01)) return;
    if (u.uMix.value > 0.5 && u.uB.value) {
      u.uA.value = u.uB.value;
      u.uAspA.value = u.uAspB.value;
      u.uHasA.value = 1;
    }
    u.uB.value = t;
    u.uAspB.value = aspect;
    u.uHasB.value = 1;
    u.uMix.value = 0;
  }

  /* ------------------------------ Loop ------------------------------ */
  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.last = performance.now();
    this.cards.forEach((c) => c.video?.play().catch(() => {}));
    this.raf = requestAnimationFrame(this.tick);
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.cards.forEach((c) => c.video?.pause());
  }
  private tick = (now: number) => {
    if (!this.running) return;
    this.frame(now, false);
    this.raf = requestAnimationFrame(this.tick);
  };

  private frame(now: number, still: boolean) {
    const dt = still ? 0 : Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const rm = this.reduce;
    if (!rm) this.time += dt;
    const f = this.flight;

    /* Drag momentum: coast with 0.93 friction per 60 Hz frame. */
    const s = this.spin;
    if (!s.dragging && !rm) {
      s.a += s.v * dt;
      s.v *= Math.pow(0.93, dt * 60);
    }
    const speed = Math.max(-2.5, Math.min(2.5, s.v));

    /* Hover: raycast for mouse pointers; touch focuses on tap only. */
    if (this.pointer.type === 'mouse' && this.pointer.inside && !s.dragging && f.camZ > 5.4) {
      const h = this.hit();
      if (h !== null) this.setFocus(h);
      else if (!this.holdFocus) this.setFocus(null);
    }
    if (f.camZ < 5.4 && this.focused !== null) this.setFocus(null);

    /* Camera: pointer parallax springs, drag bank, scroll flight. */
    const px = this.pointer.inside && !rm ? this.pointer.x : 0;
    const py = this.pointer.inside && !rm ? this.pointer.y : 0;
    step(this.cam.x, px * 0.9, 40, 12, dt);
    step(this.cam.y, -py * 0.9 * 0.7, 40, 12, dt);
    step(this.cam.roll, -px * 0.035 + speed * 0.05, 60, 14, dt);
    if (still) {
      this.cam.x.x = px * 0.9;
      this.cam.y.x = -py * 0.63;
    }
    this.camera.position.set(this.cam.x.x * (this.phone ? 0.4 : 1), this.cam.y.x * (this.phone ? 0.4 : 1), f.camZ);
    this.camera.rotation.set(this.cam.y.x * -0.02, this.cam.x.x * 0.03 + speed * 0.025, this.cam.roll.x + f.bank);
    this.camera.updateMatrixWorld();
    this.sky.position.copy(this.camera.position);

    /* Sky accent and backdrop cross-fade. */
    step(this.accent.amt, this.focused !== null ? 1 : 0, 30, 11, dt);
    if (still) this.accent.amt.x = this.focused !== null ? 1 : 0;
    this.skyMat.uniforms.uAccentAmt.value = Math.max(0, Math.min(1, this.accent.amt.x));
    (this.skyMat.uniforms.uAccent.value as THREE.Vector3).lerp(this.accent.cur, still ? 1 : 1 - Math.exp(-dt * 6));
    this.skyMat.uniforms.uTime.value = this.time;
    const bu = this.backMat.uniforms;
    const ease = 1 - Math.exp(-dt * 5);
    bu.uOpacity.value += (0.34 - bu.uOpacity.value) * (still ? 1 : ease * 0.6);
    // Cross-fade to the focused country; the last one stays until the next arrives.
    if (bu.uHasB.value > 0.5) bu.uMix.value = Math.min(1, bu.uMix.value + dt * 2.4 + (still ? 1 : 0));

    /* Cards */
    const pos = this.tmp;
    const anyFocus = this.focused !== null;
    const bend = 0.12 + Math.min(0.22, Math.abs(speed) * 0.09);
    this.cards.forEach((st, i) => {
      const isF = this.focused === i;
      step(st.focus, isF ? 1 : 0, 260, 24, dt);
      step(st.recede, anyFocus && !isF ? 1 : 0, 200, 26, dt);
      const uv = (st.mesh.userData as { uv?: THREE.Vector2 }).uv;
      const tx = isF && uv && this.pointer.type === 'mouse' ? (uv.y - 0.5) * -2 * 12 * DEG : 0;
      const ty = isF && uv && this.pointer.type === 'mouse' ? (uv.x - 0.5) * 2 * 12 * DEG : 0;
      step(st.tiltX, tx, 180, 20, dt);
      step(st.tiltY, ty, 180, 20, dt);
      if (still || rm) {
        st.focus.x = isF ? 1 : 0;
        st.recede.x = anyFocus && !isF ? 1 : 0;
      }
      const fo = st.focus.x;
      const re = st.recede.x;
      const b = st.burst.b;

      this.home(st, pos);
      const dist = REST_Z - st.z;
      const baseScale = Math.pow(dist / 4.5, 0.62) * (this.phone ? 0.62 : 1);
      // gentle idle drift, so the tunnel breathes
      const drift = rm ? 0 : 1;
      pos.x += Math.sin(this.time * 0.31 + i * 1.7) * 0.08 * dist * 0.12 * drift;
      pos.y += Math.cos(this.time * 0.27 + i * 2.3) * 0.1 * dist * 0.12 * drift;
      // burst from a tight cluster behind the centre
      pos.x *= b;
      pos.y *= b;
      pos.z = -18 + (pos.z + 18) * Math.min(1.08, b);
      st.proxy.position.copy(pos);
      // Focus: leap at least 2.2 toward the camera and always in front of every other
      // card, keeping its place on screen, then a little toward the corridor.
      const leap = Math.max(2.2, LEAP_Z - pos.z) * fo;
      const zNow = pos.z + leap - 1.2 * re;
      const keep = (REST_Z - zNow) / Math.max(0.5, REST_Z - pos.z);
      const restS = baseScale * (0.25 + 0.75 * Math.min(1, b)) * keep;
      // The focused card grows to about half the view (1.38x at the least) and stays fully on screen.
      const hh2 = Math.max(0.3, REST_Z - zNow) * Math.tan((FOV / 2) * DEG);
      const hw2 = hh2 * this.camera.aspect;
      const big = Math.max(restS * 1.38, ((this.phone ? 0.3 : 0.5) * 2 * hh2) / st.size.y);
      const sNow = restS + (big - restS) * fo;
      const mx = Math.max(0, hw2 * 0.95 - (st.size.x * big) / 2);
      const my = Math.max(0, hh2 * (this.phone ? 0.62 : 0.86) - (st.size.y * big) / 2);
      const x0 = pos.x * keep;
      const y0 = pos.y * keep;
      pos.x = x0 + (Math.max(-mx, Math.min(mx, x0)) - x0) * fo;
      pos.y = y0 + (Math.max(-my, Math.min(my, y0)) - y0) * fo;
      pos.z = zNow;
      st.group.position.copy(pos);

      const fx = pos.x / Math.max(0.001, dist * Math.tan((FOV / 2) * DEG) * this.camera.aspect);
      const fy = pos.y / Math.max(0.001, dist * Math.tan((FOV / 2) * DEG));
      const yaw = -fx * 0.42 * (1 - fo) + st.tiltY.x;
      const pitch = fy * 0.3 * (1 - fo) + st.tiltX.x;
      const roll = st.roll * (1 - fo);
      st.group.rotation.set(pitch, yaw, roll);
      st.proxy.rotation.set(fy * 0.3, -fx * 0.42, st.roll);
      st.proxy.scale.setScalar(baseScale * (0.25 + 0.75 * Math.min(1, b)));
      st.group.scale.setScalar(sNow);

      const op = Math.min(1, b * 2.5) * (1 - 0.58 * re);
      st.mat.uniforms.uOpacity.value = op;
      st.mat.uniforms.uBend.value = bend * (1 - fo);
      st.mat.uniforms.uGlow.value = fo;
      st.shadowMat.uniforms.uOpacity.value = op * (1 + fo * 0.6);
      st.shadowMat.uniforms.uBend.value = bend * (1 - fo);
      st.shadow.position.set(0.05 + fo * 0.06, -0.12 - fo * 0.14, -0.06 - fo * 0.1);
      // Cards the camera has flown past are hidden, so they never smear across the lens.
      st.group.visible = pos.z < f.camZ - 0.25;
      // transparent cards draw back to front
      const ro = Math.round((pos.z + 40) * 10) * 2 + (isF ? 4000 : 0);
      st.shadow.renderOrder = ro;
      st.mesh.renderOrder = ro + 1;
    });

    this.updatePlane(dt, rm);
    this.updateTag();

    this.dustMat.uniforms.uTime.value = this.time;
    this.renderer.render(this.scene, this.camera);
  }

  private updatePlane(dt: number, rm: boolean) {
    const p = this.planeState;
    const f = this.flight;
    if (!rm) p.t += dt;
    const ph = this.phone;
    // idle: a lazy figure of eight above the words, following the pointer with spring lag
    const idle = this.tmp2.set(Math.sin(p.t * 0.45) * (ph ? 0.5 : 1.7), (ph ? 0.62 : 0.95) + Math.sin(p.t * 0.9) * (ph ? 0.12 : 0.28), 2.4 + Math.cos(p.t * 0.45) * 0.7);
    if (rm) idle.set(ph ? 0.35 : 1.3, ph ? 0.6 : 0.9, 2.4);
    const px = this.pointer.inside && !rm ? this.pointer.x : 0;
    const py = this.pointer.inside && !rm ? this.pointer.y : 0;
    p.follow.x += (px * (ph ? 0.4 : 0.8) - p.follow.x) * (1 - Math.exp(-dt * 2.2));
    p.follow.y += (-py * 0.45 - p.follow.y) * (1 - Math.exp(-dt * 2.2));
    idle.x += p.follow.x;
    idle.y += p.follow.y;
    // scroll: dive straight down the middle of the tunnel, ahead of the camera
    const d = f.dive;
    const dive = d * d * (3 - 2 * d);
    const target = idle.lerp(this.tmp.set(0, -0.15, f.camZ - 2.6 - 9 * d), dive);
    const prev = this.plane.position.clone();
    if (dt === 0) this.plane.position.copy(target);
    else this.plane.position.lerp(target, 1 - Math.exp(-dt * 6));
    const vel = this.plane.position.clone().sub(prev);
    if (dt > 0) p.vel.lerp(vel.divideScalar(dt), 1 - Math.exp(-dt * 8));
    // heading: along the velocity, blending to straight ahead (-Z) while diving
    const head = this.tmp.copy(p.vel);
    head.z -= 0.6 + dive * 4;
    if (head.lengthSq() < 1e-4) head.set(0, 0, -1);
    head.normalize();
    this.tmpM.lookAt(this.origin, head, this.up);
    this.plane.quaternion.setFromRotationMatrix(this.tmpM);
    // bank into turns
    step(p.bank, Math.max(-0.7, Math.min(0.7, -p.vel.x * 0.35)), 50, 10, dt);
    this.plane.rotateZ(p.bank.x);
    this.plane.visible = this.plane.position.z < f.camZ - 0.3;

    /* contrail ribbon from the tail */
    const tail = this.tmp2.set(0, 0, 0.42).applyQuaternion(this.plane.quaternion).multiplyScalar(this.plane.scale.x).add(this.plane.position);
    if (dt > 0) {
      this.trailPts.unshift(tail.clone());
      if (this.trailPts.length > TRAIL) this.trailPts.length = TRAIL;
    }
    const pos = this.trailGeo.getAttribute('position') as THREE.BufferAttribute;
    const fade = this.trailGeo.getAttribute('aFade') as THREE.BufferAttribute;
    const camPos = this.camera.position;
    for (let i = 0; i < TRAIL; i++) {
      const a = this.trailPts[Math.min(i, this.trailPts.length - 1)] ?? tail;
      const b = this.trailPts[Math.min(i + 1, this.trailPts.length - 1)] ?? a;
      const dir = this.tmp.copy(a).sub(b);
      if (dir.lengthSq() < 1e-8) dir.set(1, 0, 0);
      const view = new THREE.Vector3().copy(camPos).sub(a);
      const side = dir.cross(view).normalize();
      const k = i / (TRAIL - 1);
      const w = (this.phone ? 0.03 : 0.045) * (1 - k) * (0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, k * 3 + 0.1)));
      pos.setXYZ(i * 2, a.x + side.x * w, a.y + side.y * w, a.z + side.z * w);
      pos.setXYZ(i * 2 + 1, a.x - side.x * w, a.y - side.y * w, a.z - side.z * w);
      const al = i < this.trailPts.length ? Math.pow(1 - k, 1.6) * 0.75 : 0;
      fade.setX(i * 2, al);
      fade.setX(i * 2 + 1, al);
    }
    pos.needsUpdate = true;
    fade.needsUpdate = true;
    this.trailMat.uniforms.uOpacity.value = this.plane.visible ? 1 : 0;
    this.trailMesh.renderOrder = Math.round((this.plane.position.z + 40) * 10) * 2 + 1;
  }

  /** Pin the HTML passport stamp tag just under the focused card. */
  private updateTag() {
    const el = this.tagEl;
    if (!el) return;
    const i = this.focused;
    if (i === null) return;
    const st = this.cards[i];
    const p = this.tmp.set(0, -st.size.y / 2 - 0.08, 0).applyMatrix4(st.group.matrixWorld).project(this.camera);
    const x = (p.x * 0.5 + 0.5) * this.w;
    const y = (-p.y * 0.5 + 0.5) * this.h;
    const tw = el.offsetWidth;
    const th = el.offsetHeight;
    const cx = Math.max(12, Math.min(this.w - tw - 12, x - tw / 2));
    const cy = Math.max(12, Math.min(this.h - th - 12, y + 10));
    el.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.cards.forEach((c) => {
      if (c.video) {
        c.video.pause();
        c.video.removeAttribute('src');
        c.video.load();
      }
      c.tex?.dispose();
      (c.mat.uniforms.uMap.value as THREE.Texture | null)?.dispose();
    });
    (this.backMat.uniforms.uA.value as THREE.Texture | null)?.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.renderer.dispose();
  }
}
