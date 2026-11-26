/**
 * The 3D scene on the home page (plain three.js).
 *
 *   - a photo-real Earth: daylight on one side, city lights on the other
 *   - a soft blue atmosphere and a field of stars
 *   - a light on every covered country
 *   - a paper plane that flies a route of great-circle hops, leaving a trail
 *
 * How the flight works: the plane stays near the middle of the view and the
 * Earth turns underneath it, so the plane is always in frame. `progress`
 * is a number like 2.4 = "40% of the way from stop 2 to stop 3".
 *
 * FlightHome.tsx owns scrolling and input and calls `render()` each frame.
 * Earth images: NASA Blue Marble / Black Marble (public domain).
 */
import * as THREE from 'three';

// Colours and textures are authored in plain sRGB and drawn as-is, like CSS.
THREE.ColorManagement.enabled = false;

export interface Place {
  lat: number;
  lng: number;
}

export interface Frame {
  /** Position along the route, 0 to (stops - 1). */
  progress: number;
  /** 0 = flying the route, 1 = free roam (visitor spins the globe). */
  free: number;
  /** Globe centre (world units) and size for the current screen layout. */
  x: number;
  y: number;
  scale: number;
  /** Extra rotation from dragging, in radians. */
  dragX: number;
  dragY: number;
  /** Seconds since start, for gentle idle motion. */
  time: number;
}

const DEG = Math.PI / 180;
const SUN = new THREE.Vector3(-0.55, 0.35, 0.75).normalize();

export function onSphere(lat: number, lng: number, radius = 1): THREE.Vector3 {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
}

/** A point part-way along the great circle between two unit vectors. */
function slerp(a: THREE.Vector3, b: THREE.Vector3, t: number, out: THREE.Vector3) {
  const omega = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1));
  if (omega < 1e-5) return out.copy(a);
  const s = Math.sin(omega);
  return out
    .copy(a)
    .multiplyScalar(Math.sin((1 - t) * omega) / s)
    .addScaledVector(b, Math.sin(t * omega) / s);
}

/** How high the plane is at point t of a hop: up, cruise, down. */
const altitude = (t: number) => 0.035 + 0.16 * Math.sin(Math.PI * t);

export class FlightWorld {
  readonly camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private globe = new THREE.Group();
  private earth: THREE.ShaderMaterial;
  private lights: THREE.ShaderMaterial;
  private plane = new THREE.Group();
  private trails: THREE.Mesh[] = [];
  private ring: THREE.Mesh;
  private stars: THREE.Points;
  private stops: THREE.Vector3[];
  private places: THREE.Vector3[];
  private width = 1;
  private height = 1;
  // scratch objects, so the render loop allocates nothing
  private a = new THREE.Vector3();
  private b = new THREE.Vector3();
  private c = new THREE.Vector3();
  private d = new THREE.Vector3();
  private m = new THREE.Matrix4();
  private rotY = 0;
  private rotX = 0;
  private bright = false;
  private dpr = 1;
  private capped = false;
  private slowFor = 0;
  private frameMs = 16.7;
  /** Country to circle with a pulsing ring in free roam (-1 = none). */
  highlight = -1;

  /** Height of the visible area at the globe's depth, in world units. */
  get viewHeight() {
    return 2 * this.camera.position.z * Math.tan((this.camera.fov / 2) * DEG);
  }

  constructor(canvas: HTMLCanvasElement, places: Place[], route: number[], textures: { day: string; night: string }, look: 'space' | 'bright' = 'space') {
    this.bright = look === 'bright';
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.camera.position.set(0, 0, 4.6);
    this.scene.add(this.globe);

    this.places = places.map((p) => onSphere(p.lat, p.lng));
    this.stops = route.map((i) => this.places[i]);

    /* ------------------------------ Earth ------------------------------ */
    const loader = new THREE.TextureLoader();
    const load = (url: string, onLoad?: () => void) => {
      const t = loader.load(url, onLoad);
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = 4;
      return t;
    };
    this.earth = new THREE.ShaderMaterial({
      uniforms: {
        uDay: { value: load(textures.day, () => (this.earth.uniforms.uHasDay.value = 1)) },
        // The bright look never shows the night side, so it skips that download.
        uNight: { value: this.bright ? new THREE.Texture() : load(textures.night) },
        uSun: { value: SUN },
        uBright: { value: this.bright ? 1 : 0 },
        uHasDay: { value: 0 },
      },
      vertexShader: `varying vec2 vUv; varying vec3 vWorld; varying vec3 vView;
        void main(){ vUv = uv; vWorld = normalize(mat3(modelMatrix) * normal); vView = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D uDay; uniform sampler2D uNight; uniform vec3 uSun; uniform float uBright; uniform float uHasDay; varying vec2 vUv; varying vec3 vWorld; varying vec3 vView;
        void main(){
          float lit = dot(normalize(vWorld), uSun);
          if (uBright > 0.5) {
            // Daylight everywhere: richer colour, turquoise seas, a soft sun
            // from the upper left and a crisp turquoise to sky rim.
            // Until the photo arrives, draw a plain turquoise sea (never a dark ball).
            vec3 c = uHasDay > 0.5 ? texture2D(uDay, vUv).rgb : vec3(0.12, 0.42, 0.62);
            float l = dot(c, vec3(0.299, 0.587, 0.114));
            c = mix(vec3(l), c, 1.45) * 1.12;
            float sea = smoothstep(0.02, 0.12, c.b - max(c.r, c.g * 0.92));
            c = mix(c, mix(c, vec3(0.1, 0.74, 0.8), 0.55) * 1.2 + 0.06, sea);
            c = mix(c, c * vec3(1.04, 1.0, 0.93), 0.5 * (1.0 - sea));
            vec3 n = normalize(vView);
            c *= 0.84 + 0.28 * max(n.z, 0.0);
            float sun = pow(max(dot(n, normalize(vec3(-0.45, 0.5, 0.74))), 0.0), 18.0);
            c += vec3(1.0, 0.93, 0.78) * sun * (0.22 + 0.25 * sea);
            float r = pow(1.0 - max(n.z, 0.0), 2.4);
            c += mix(vec3(0.07, 0.71, 0.65), vec3(0.45, 0.85, 1.0), clamp(n.y * 0.5 + 0.5, 0.0, 1.0)) * r * 0.6;
            gl_FragColor = vec4(c, 1.0);
            return;
          }
          float day = smoothstep(-0.18, 0.3, lit);
          vec3 dayCol = texture2D(uDay, vUv).rgb * (0.55 + 0.6 * max(lit, 0.0));
          vec3 nightCol = texture2D(uNight, vUv).rgb * vec3(1.9, 1.55, 1.05) + vec3(0.012, 0.016, 0.05);
          vec3 col = mix(nightCol, dayCol, day);
          float rim = pow(1.0 - max(vView.z, 0.0), 3.0);
          col += vec3(0.25, 0.62, 1.0) * rim * (0.25 + 0.5 * day);
          gl_FragColor = vec4(col, 1.0); }`,
    });
    this.globe.add(new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), this.earth));

    /* --------------------------- Atmosphere ---------------------------- */
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.16, 64, 48),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        // Brightest where the halo meets the Earth's edge, fading to nothing at its outer rim.
        fragmentShader: this.bright
          ? `varying vec3 vN; void main(){ float g = pow(clamp(-vN.z / 0.5, 0.0, 1.0), 2.0);
          vec3 col = mix(vec3(0.07, 0.71, 0.65), vec3(0.42, 0.84, 1.0), clamp(vN.y * 0.5 + 0.5, 0.0, 1.0));
          gl_FragColor = vec4(col, g * 0.75); }`
          : `varying vec3 vN; void main(){ float g = pow(clamp(-vN.z / 0.5, 0.0, 1.0), 2.2);
          gl_FragColor = vec4(0.3, 0.72, 1.0, g * 0.85); }`,
      }),
    );
    this.globe.add(halo);

    /* ---------------------- A light on each country --------------------- */
    const pos = new Float32Array(places.length * 3);
    const kind = new Float32Array(places.length);
    this.places.forEach((p, i) => {
      pos.set([p.x * 1.012, p.y * 1.012, p.z * 1.012], i * 3);
      kind[i] = route.includes(i) ? 1 : 0;
    });
    const lightGeo = new THREE.BufferGeometry();
    lightGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    lightGeo.setAttribute('aStop', new THREE.BufferAttribute(kind, 1));
    this.lights = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uSize: { value: 20 }, uFree: { value: 0 }, uTime: { value: 0 } },
      vertexShader: `attribute float aStop; uniform float uSize; uniform float uFree; uniform float uTime; varying float vGlow;
        void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          float on = max(aStop, uFree);
          float twinkle = 0.85 + 0.15 * sin(uTime * 3.0 + position.x * 40.0);
          gl_PointSize = uSize * (0.55 + 0.6 * on) * twinkle; vGlow = 0.45 + 0.55 * on; }`,
      fragmentShader: `varying float vGlow; void main(){ float d = length(gl_PointCoord - 0.5);
          float core = smoothstep(0.16, 0.05, d); float glow = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(mix(vec3(1.0, 0.72, 0.01), vec3(1.0, 0.96, 0.85), core), clamp(glow * glow * 1.4 + core, 0.0, 1.0) * vGlow); }`,
    });
    this.globe.add(new THREE.Points(lightGeo, this.lights));

    /* ------------------------- Flight trails --------------------------- */
    for (let i = 0; i < this.stops.length - 1; i++) {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 48; k++) {
        const t = k / 48;
        pts.push(slerp(this.stops[i], this.stops[i + 1], t, new THREE.Vector3()).multiplyScalar(1 + altitude(t)));
      }
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, 0.0045, 5, false),
        new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.95 }),
      );
      tube.geometry.setDrawRange(0, 0);
      this.trails.push(tube);
      this.globe.add(tube);
    }

    /* ---------------------- Ring on the next stop ----------------------- */
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.035, 0.043, 40),
      new THREE.MeshBasicMaterial({ color: 0xfff4e0, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.globe.add(this.ring);

    /* --------------------------- Paper plane --------------------------- */
    // A folded dart: two wings and a keel, nose pointing along +Z.
    const v = [0, 0, 1, -0.62, 0.06, -0.9, 0, 0.1, -0.9, 0, 0, 1, 0, 0.1, -0.9, 0.62, 0.06, -0.9, 0, 0, 1, 0, 0.1, -0.9, 0, -0.3, -0.75];
    const planeGeo = new THREE.BufferGeometry();
    planeGeo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    // Each fold gets its own shade of cream, so it reads as folded paper from any angle.
    const shades = [1, 0.96, 0.88, 0.9, 0.84, 0.76, 0.62, 0.58, 0.5];
    planeGeo.setAttribute('color', new THREE.Float32BufferAttribute(shades.flatMap((k) => [1.0 * k, 0.957 * k, 0.878 * k]), 3));
    const paper = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    paper.scale.setScalar(0.1);
    this.plane.add(paper);
    this.scene.add(this.plane);

    /* ------------------------------ Stars ------------------------------ */
    const count = 700;
    const starPos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // deterministic scatter (golden angle), so the sky is the same on every visit
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = i * 2.39996;
      starPos.set([Math.cos(t) * r * 40, y * 40, Math.sin(t) * r * 40 - 10], i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xfff4e0, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.75 }));
    this.scene.add(this.stars);
    if (this.bright) {
      this.stars.visible = false;
      (this.ring.material as THREE.MeshBasicMaterial).color.set(0xff6b5b);
    }
  }

  resize(width: number, height: number, dpr: number) {
    this.width = width;
    this.height = height;
    // Once the frame guard has lowered the ratio, keep it lowered.
    if (this.capped) dpr = Math.min(dpr, this.dpr);
    this.dpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.lights.uniforms.uSize.value = Math.max(14, Math.min(width, height) * 0.03) * dpr;
  }

  /** Where the plane is (unit vector on the globe) for a given progress. */
  private along(progress: number, out: THREE.Vector3) {
    const last = this.stops.length - 1;
    const p = THREE.MathUtils.clamp(progress, 0, last);
    const i = Math.min(last - 1, Math.floor(p));
    return slerp(this.stops[i], this.stops[i + 1], p - i, out);
  }

  render(f: Frame) {
    const last = this.stops.length - 1;
    const p = THREE.MathUtils.clamp(f.progress, 0, last);
    const leg = Math.min(last - 1, Math.floor(p));
    const t = p - leg;

    // Turn the Earth so the plane's position faces the camera (north stays up).
    const here = this.along(p, this.a);
    const lat = Math.asin(THREE.MathUtils.clamp(here.y, -1, 1));
    const lng = Math.atan2(here.z, -here.x) - Math.PI;
    const targetY = -(Math.PI / 2 + lng) + f.dragX;
    const targetX = THREE.MathUtils.clamp(lat * 0.75 + f.dragY, -1.1, 1.1);
    this.rotY = targetY;
    this.rotX = targetX;
    this.globe.rotation.set(this.rotX, this.rotY, 0, 'XYZ');
    this.globe.position.set(f.x, f.y, 0);
    // Pull back a little mid-hop so the whole arc is visible.
    this.globe.scale.setScalar(f.scale * (1 - 0.1 * Math.sin(Math.PI * t) * (1 - f.free)));
    this.globe.updateMatrixWorld();

    // Trails: finished hops fully drawn, the current one up to the plane.
    this.trails.forEach((tube, i) => {
      const total = tube.geometry.index!.count;
      const shown = i < leg ? 1 : i === leg ? t : 0;
      tube.geometry.setDrawRange(0, Math.floor((shown * total) / 30) * 30);
      (tube.material as THREE.MeshBasicMaterial).opacity = (i === leg ? 0.95 : 0.4) * (1 - f.free);
      tube.visible = f.free < 0.98;
    });

    // Plane: on the arc, nose along the direction of travel, wings level with the ground.
    const alt = 1 + altitude(t);
    const pos = this.a.multiplyScalar(alt).applyMatrix4(this.globe.matrixWorld);
    const ahead = this.along(Math.min(last, p + 0.02), this.b).multiplyScalar(1 + altitude(Math.min(1, t + 0.02))).applyMatrix4(this.globe.matrixWorld);
    const behind = this.along(Math.max(0, p - 0.02), this.c).multiplyScalar(1 + altitude(Math.max(0, t - 0.02))).applyMatrix4(this.globe.matrixWorld);
    const forward = this.d.copy(ahead).sub(behind).normalize();
    const up = this.c.copy(pos).sub(this.globe.position).normalize();
    const right = this.b.crossVectors(up, forward).normalize();
    up.crossVectors(forward, right).normalize();
    this.m.makeBasis(right, up, forward);
    this.plane.quaternion.setFromRotationMatrix(this.m);
    this.plane.position.copy(pos);
    const planeScale = f.scale * (1 - f.free);
    this.plane.scale.setScalar(Math.max(0.0001, planeScale));
    this.plane.visible = planeScale > 0.02;

    // Pulsing ring on the stop we are flying to, or on the picked country.
    const pulse = (f.time * 0.9) % 1;
    const picked = this.highlight >= 0 && f.free > 0.5;
    const next = picked ? this.places[this.highlight] : this.stops[Math.min(last, leg + 1)];
    this.ring.position.copy(next).multiplyScalar(1.014);
    this.ring.quaternion.setFromUnitVectors(this.c.set(0, 0, 1), next);
    this.ring.scale.setScalar((1 + pulse * 1.8) * (picked ? 1.6 : 1));
    (this.ring.material as THREE.MeshBasicMaterial).opacity = (1 - pulse) * (picked ? 1 : 1 - f.free);

    this.lights.uniforms.uFree.value = f.free;
    this.lights.uniforms.uTime.value = f.time;
    this.stars.rotation.y = this.rotY * 0.04;
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Adaptive quality: call once a frame with the frame time. If frames stay
   * slow for about a second, draw at a lower pixel ratio (never below 1) so
   * dragging stays fluid on older phones. Returns true when it changed.
   */
  adapt(frameMs: number) {
    if (frameMs > 200) return false; // a tab switch, not a slow device
    this.frameMs += (frameMs - this.frameMs) * 0.08;
    if (this.frameMs > 24 && this.dpr > 1) {
      this.slowFor += frameMs;
      if (this.slowFor > 1000) {
        this.dpr = Math.max(1, this.dpr - 0.25);
        this.renderer.setPixelRatio(this.dpr);
        this.renderer.setSize(this.width, this.height, false);
        this.lights.uniforms.uSize.value = Math.max(14, Math.min(this.width, this.height) * 0.03) * this.dpr;
        this.capped = true;
        this.slowFor = 0;
        this.frameMs = 16.7;
        return true;
      }
    } else if (this.slowFor > 0) this.slowFor = 0;
    return false;
  }

  /** Screen position of a country (pixels), whether it is on the near side, and how squarely it faces us (depth, 1 = centre). */
  project(index: number, out: { x: number; y: number; visible: boolean; depth?: number }) {
    const world = this.a.copy(this.places[index]).applyMatrix4(this.globe.matrixWorld);
    const facing = this.b.copy(world).sub(this.globe.position).normalize().dot(this.c.copy(this.camera.position).sub(this.globe.position).normalize());
    world.project(this.camera);
    out.x = (world.x * 0.5 + 0.5) * this.width;
    out.y = (-world.y * 0.5 + 0.5) * this.height;
    out.visible = facing > 0.15;
    out.depth = facing;
    return out;
  }

  /** Screen centre and radius of the globe, for placing the drag area. */
  disc(out: { x: number; y: number; r: number }) {
    const pxPerUnit = this.height / this.viewHeight;
    out.x = this.width / 2 + this.globe.position.x * pxPerUnit;
    out.y = this.height / 2 - this.globe.position.y * pxPerUnit;
    out.r = this.globe.scale.x * pxPerUnit;
    return out;
  }

  dispose() {
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    (this.earth.uniforms.uDay.value as THREE.Texture).dispose();
    (this.earth.uniforms.uNight.value as THREE.Texture).dispose();
    this.renderer.dispose();
  }
}
