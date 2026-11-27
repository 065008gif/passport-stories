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
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createJetMesh } from '@/components/home/luxuryJet';

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
  // Helper state for the home page explorer (unused by /fly).
  private dpr = 1;
  private capped = false;
  private slowFor = 0;
  private frameMs = 16.7;
  /** Country to circle with the pulsing ring while free roaming (-1 = none). Home page helper. */
  highlight = -1;
  private arcGroup: THREE.Group | null = null;
  private arcCurve: THREE.QuadraticBezierCurve3 | null = null;
  private arcStart = -1;
  private guide: THREE.Group | null = null;
  private guideCurve: THREE.QuadraticBezierCurve3 | null = null;
  /** home page: the globe jet may only show once the seam bridge has landed it */
  private guideAllowed = false;
  /** a pick made before the jet landed, flown the moment it does */
  private pendingFly = -1;
  /** the jet has been on the globe before (so it returns to its own spot) */
  private guidePlaced = false;
  /** poised hover: the jet's direction in world space, held still while the Earth turns under it */
  private gHold: THREE.Vector3 | null = null;
  private tdNdc = new THREE.Vector2(0.16, 0.22);
  private guideStart = -1;
  private guideDir = new THREE.Vector3(0, 0, -1);
  private gPos = new THREE.Vector3();
  private gTan = new THREE.Vector3();
  private gUp = new THREE.Vector3();
  private gM = new THREE.Matrix4();
  private gQ = new THREE.Quaternion();
  // cursor steering (home page): where the jet is heading on the orbital shell
  private aim: THREE.Vector3 | null = null;
  /** a cursor aim, fixed to the screen point (world space) while the Earth turns */
  private aimWorld: THREE.Vector3 | null = null;
  private gDir = new THREE.Vector3(0, 0, 1);
  private gHead = new THREE.Vector3(1, 0, 0);
  private gBank = 0;
  private gLast = -1;
  private gRay = new THREE.Raycaster();
  private gSphere = new THREE.Sphere();
  private gInv = new THREE.Matrix4();
  private vapor: { mesh: THREE.Mesh; pts: { p: THREE.Vector3; h: THREE.Vector3; t: number }[] } | null = null;
  // scratch objects, so the render loop allocates nothing
  private a = new THREE.Vector3();
  private b = new THREE.Vector3();
  private c = new THREE.Vector3();
  private d = new THREE.Vector3();
  private m = new THREE.Matrix4();
  private rotY = 0;
  private rotX = 0;

  /** Height of the visible area at the globe's depth, in world units. */
  get viewHeight() {
    return 2 * this.camera.position.z * Math.tan((this.camera.fov / 2) * DEG);
  }

  constructor(canvas: HTMLCanvasElement, places: Place[], route: number[], textures: { day: string; night: string }) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.camera.position.set(0, 0, 4.6);
    this.scene.add(this.globe);

    this.places = places.map((p) => onSphere(p.lat, p.lng));
    this.stops = route.map((i) => this.places[i]);

    /* ------------------------------ Earth ------------------------------ */
    const loader = new THREE.TextureLoader();
    const load = (url: string) => {
      const t = loader.load(url);
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = 4;
      return t;
    };
    this.earth = new THREE.ShaderMaterial({
      uniforms: { uDay: { value: load(textures.day) }, uNight: { value: load(textures.night) }, uSun: { value: SUN } },
      vertexShader: `varying vec2 vUv; varying vec3 vWorld; varying vec3 vView;
        void main(){ vUv = uv; vWorld = normalize(mat3(modelMatrix) * normal); vView = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D uDay; uniform sampler2D uNight; uniform vec3 uSun; varying vec2 vUv; varying vec3 vWorld; varying vec3 vView;
        void main(){
          float lit = dot(normalize(vWorld), uSun);
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
        fragmentShader: `varying vec3 vN; void main(){ float g = pow(clamp(-vN.z / 0.5, 0.0, 1.0), 2.2);
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
  }

  resize(width: number, height: number, dpr: number) {
    this.width = width;
    this.height = height;
    // Once adapt() has lowered the pixel ratio, keep it lowered.
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

    // Pulsing ring on the stop we are flying to.
    const pulse = (f.time * 0.9) % 1;
    const picked = this.highlight >= 0 && f.free > 0.5;
    const next = picked ? this.places[this.highlight] : this.stops[Math.min(last, leg + 1)];
    this.ring.position.copy(next).multiplyScalar(1.014);
    this.ring.quaternion.setFromUnitVectors(this.c.set(0, 0, 1), next);
    this.ring.scale.setScalar(1 + pulse * 1.8);
    (this.ring.material as THREE.MeshBasicMaterial).opacity = (1 - pulse) * (picked ? 1 : 1 - f.free);
    if (picked) this.ring.scale.multiplyScalar(1.6);
    (this.ring.material as THREE.MeshBasicMaterial).color.set(picked ? 0xff6b5b : 0xfff4e0);

    // The home page guide: glides along its curve (0.75 s, eased out), nose on the tangent, level over the surface.
    const gdt = this.gLast < 0 ? 0 : Math.min(0.05, Math.max(0, f.time - this.gLast));
    this.gLast = f.time;
    if (this.guide && this.guide.visible && !this.guideCurve) {
      // great circle steering on the orbital shell, nose along the motion, banking with the turn
      const g = this.guide;
      this.gDir.copy(g.position).normalize();
      this.globe.updateMatrixWorld();
      if (this.aimWorld) this.aim = this.aimWorld.clone().transformDirection(this.gInv.copy(this.globe.matrixWorld).invert());
      if (!this.aim) {
        // no cursor on the globe: hover calmly where it is, on the face toward the viewer
        if (!this.gHold) this.gHold = this.gDir.clone().transformDirection(this.globe.matrixWorld);
        else this.gDir.copy(this.gHold).transformDirection(this.gInv.copy(this.globe.matrixWorld).invert());
      } else this.gHold = null;
      if (this.aim) {
        const angle = Math.acos(THREE.MathUtils.clamp(this.gDir.dot(this.aim), -1, 1));
        if (angle > 1e-4) {
          const stepA = Math.min(angle, gdt * Math.min(2.4, angle * 5 + 0.15));
          const axis = this.gTan.crossVectors(this.gDir, this.aim).normalize();
          this.gDir.applyAxisAngle(axis, stepA);
          const head = this.gUp.crossVectors(axis, this.gDir).normalize();
          const turn = gdt > 0 ? Math.atan2(this.gHead.clone().cross(head).dot(this.gDir), this.gHead.dot(head)) / gdt : 0;
          this.gHead.lerp(head, 1 - Math.exp(-gdt * 10)).normalize();
          this.gBank += (THREE.MathUtils.clamp(-turn * 0.12, -26 * (Math.PI / 180), 26 * (Math.PI / 180)) - this.gBank) * (1 - Math.exp(-gdt * 6));
        } else this.gBank *= Math.exp(-gdt * 4);
      } else this.gBank *= Math.exp(-gdt * 4);
      g.position.copy(this.gDir).multiplyScalar(1.08);
      this.gHead.addScaledVector(this.gDir, -this.gHead.dot(this.gDir)).normalize();
      this.gM.lookAt(this.c.set(0, 0, 0), this.gHead, this.gDir);
      this.gQ.setFromRotationMatrix(this.gM).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.gBank));
      g.quaternion.slerp(this.gQ, 1 - Math.exp(-gdt * 12));
    }
    // the vapor ribbon follows the jet across the surface
    if (this.guide && this.vapor) {
      const v = this.vapor;
      const head = v.pts[0];
      if (this.guide.visible && (!head || head.p.distanceToSquared(this.guide.position) > 0.00012)) {
        v.pts.unshift({ p: this.guide.position.clone().setLength(1.07), h: this.gHead.clone(), t: f.time });
        if (v.pts.length > 40) v.pts.length = 40;
      }
      const pos = v.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colr = v.mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
      for (let i = 0; i < 40; i++) {
        const pt = v.pts[Math.min(i, v.pts.length - 1)];
        if (!pt) {
          colr.setXYZW(i * 2, 0, 0, 0, 0);
          colr.setXYZW(i * 2 + 1, 0, 0, 0, 0);
          continue;
        }
        const side = this.gTan.crossVectors(pt.h, pt.p).normalize().multiplyScalar(0.008 * (1 - i / 40));
        pos.setXYZ(i * 2, pt.p.x + side.x, pt.p.y + side.y, pt.p.z + side.z);
        pos.setXYZ(i * 2 + 1, pt.p.x - side.x, pt.p.y - side.y, pt.p.z - side.z);
        const a = i < v.pts.length ? Math.pow(1 - i / 40, 1.4) * Math.max(0, 1 - (f.time - pt.t) / 1.8) : 0;
        const k = i / 40;
        colr.setXYZW(i * 2, 1, 0.42 + k * 0.35, 0.36 - k * 0.1, a);
        colr.setXYZW(i * 2 + 1, 1, 0.42 + k * 0.35, 0.36 - k * 0.1, a);
      }
      pos.needsUpdate = true;
      colr.needsUpdate = true;
    }
    if (this.guide && this.guide.visible && this.guideCurve) {
      if (this.guideStart < 0) this.guideStart = f.time;
      const k = Math.min(1, (f.time - this.guideStart) / 0.85);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this.guideCurve.getPoint(e, this.gPos);
      if (k < 1) {
        this.guideCurve.getTangent(Math.min(0.999, Math.max(0.001, e)), this.gTan);
        this.gUp.copy(this.gPos).normalize();
        this.gTan.addScaledVector(this.gUp, -this.gTan.dot(this.gUp));
        if (this.gTan.lengthSq() > 1e-6) this.guideDir.copy(this.gTan.normalize());
      }
      this.gUp.copy(this.gPos).normalize();
      this.guideDir.addScaledVector(this.gUp, -this.guideDir.dot(this.gUp)).normalize();
      this.guide.position.copy(this.gPos);
      this.gM.lookAt(this.c.set(0, 0, 0), this.guideDir, this.gUp);
      this.gQ.setFromRotationMatrix(this.gM);
      // a gentle bank into the arc, level again on arrival
      this.gQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.2 * Math.sin(Math.PI * k)));
      this.guide.quaternion.slerp(this.gQ, k < 1 ? 0.35 : 0.15);
      if (k >= 1) {
        this.gHead.copy(this.guideDir);
        this.guideCurve = null;
        // arrived: stay beside this country (it turns with the Earth) until the cursor steers again
        this.aim = this.gPos.clone().normalize();
        this.aimWorld = null;
        this.gHold = null;
      }
    }
    // The home page flight arc, if one is showing.
    if (this.arcGroup && this.arcCurve) {
      if (this.arcStart < 0) this.arcStart = f.time;
      const k = Math.min(1, (f.time - this.arcStart) / 1.1);
      const e = 1 - Math.pow(1 - k, 3);
      this.arcGroup.children.forEach((m, i) => {
        const mesh = m as THREE.Mesh;
        if (i < 2) {
          const total = mesh.geometry.index!.count;
          mesh.geometry.setDrawRange(0, Math.floor((e * total) / 48) * 48);
        } else {
          const u = k < 1 ? e : ((f.time - this.arcStart - 1.1) * 0.45) % 1;
          mesh.position.copy(this.arcCurve!.getPoint(u));
        }
      });
    }
    this.lights.uniforms.uFree.value = f.free;
    this.lights.uniforms.uTime.value = f.time;
    this.stars.rotation.y = this.rotY * 0.04;
    this.renderer.render(this.scene, this.camera);
  }

  /** Screen position of a country (pixels), and whether it is on the near side. */
  /**
   * Home page helper: a glowing flight arc from one country to another. It
   * draws itself over about a second and a pulse keeps travelling along it.
   */
  arc(from: number, to: number) {
    if (this.arcGroup) {
      this.globe.remove(this.arcGroup);
      this.arcGroup.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose();
      });
      this.arcGroup = null;
    }
    if (from < 0 || to < 0 || from === to) return;
    this.arcVec(this.places[from].clone().multiplyScalar(1.012), this.places[to].clone().multiplyScalar(1.012));
  }

  /** The flight arc between two points on or above the surface (globe space). */
  private arcVec(a: THREE.Vector3, b: THREE.Vector3) {
    if (this.arcGroup) {
      this.globe.remove(this.arcGroup);
      this.arcGroup.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose();
      });
      this.arcGroup = null;
    }
    if (a.distanceTo(b) < 1e-3) return;
    const mid = this.a.copy(a).add(b).normalize().multiplyScalar(Math.max(a.length(), b.length()) + 0.06 + a.distanceTo(b) * 0.26);
    this.arcCurve = new THREE.QuadraticBezierCurve3(a.clone(), mid.clone(), b.clone());
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TubeGeometry(this.arcCurve, 96, 0.006, 8, false), new THREE.MeshBasicMaterial({ color: 0xffc233, transparent: true, opacity: 0.95, depthWrite: false })));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(this.arcCurve, 96, 0.018, 8, false), new THREE.MeshBasicMaterial({ color: 0xff8a4c, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending })));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff4e0 })));
    this.arcGroup = g;
    this.arcStart = -1;
    this.globe.add(g);
  }

  /**
   * Home page helper: a miniature jet in the home page livery that flies
   * between countries just above the surface. Adds its own two lights; the
   * v8 materials ignore lights, so the globe looks exactly the same.
   */
  enableGuide() {
    if (this.guide) return;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xffd9c2, 1.6));
    const key = new THREE.DirectionalLight(0xfff4e0, 2.2);
    key.position.set(-2, 3, 4);
    this.scene.add(key);
    // the hero's jet in miniature, with its own studio reflections (the globe keeps its look)
    const pm = new THREE.PMREMGenerator(this.renderer);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    const g = new THREE.Group();
    const jet = createJetMesh((h) => new THREE.Color(h));
    jet.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && 'envMap' in m) m.envMap = env;
    });
    g.add(jet);
    g.scale.setScalar(0.05);
    g.visible = false;
    this.guide = g;
    this.globe.add(g);
    // a delicate coral and gold vapor ribbon that hugs the surface behind the jet
    const n = 40;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 8), 4).setUsage(THREE.DynamicDrawUsage));
    const idx: number[] = [];
    for (let i = 0; i < n - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    mesh.frustumCulled = false;
    this.vapor = { mesh, pts: [] };
    this.globe.add(mesh);
  }

  /** Home page helper: fly the guide to a country along a glowing arc (or swoop in from space). */
  guideFly(index: number, enter = false) {
    const g = this.guide;
    if (!g || index < 0) return;
    if (!this.guideAllowed) {
      this.pendingFly = index;
      return;
    }
    // hover a little north east of the country, so the beacon never hides it
    const n = this.places[index].clone().normalize();
    const east = new THREE.Vector3(0, 1, 0).cross(n);
    if (east.lengthSq() < 1e-6) east.set(1, 0, 0);
    east.normalize();
    const north = n.clone().cross(east).normalize();
    const to = n.multiplyScalar(1.1).addScaledVector(east, 0.11).addScaledVector(north, -0.07);
    const fresh = enter || !g.visible;
    let from: THREE.Vector3;
    if (fresh) {
      this.globe.updateMatrixWorld();
      const r = this.globe.scale.x;
      from = new THREE.Vector3(0, r * 1.45, 0).add(this.globe.position).applyMatrix4(this.gInv.copy(this.globe.matrixWorld).invert());
    } else from = g.position.clone();
    if (from.distanceTo(to) < 1e-3) return;
    const mid = from.clone().add(to).multiplyScalar(0.5);
    mid.setLength(Math.max(from.length(), to.length()) + 0.06 + from.distanceTo(to) * 0.2);
    this.guideCurve = new THREE.QuadraticBezierCurve3(from, mid, to);
    this.guideStart = -1;
    this.aim = null;
    this.aimWorld = null;
    g.visible = true;
    if (!fresh) this.arcVec(from, to);
  }

  /**
   * Home page helper: steer the jet toward the cursor. `ndc` is the pointer in
   * the canvas (-1..1), or null when the pointer leaves the globe. The jet only
   * ever flies on the orbital shell; off the sphere it eases to a poised hover.
   * Returns true while the pointer is over the globe.
   */
  guideAim(ndc: { x: number; y: number } | null) {
    if (!this.guide || !this.guide.visible || !ndc) {
      this.aim = null;
      this.aimWorld = null;
      return false;
    }
    this.globe.updateMatrixWorld();
    this.gRay.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), this.camera);
    this.gSphere.set(this.globe.position, 1.08 * this.globe.scale.x);
    const hit = this.gRay.ray.intersectSphere(this.gSphere, new THREE.Vector3());
    if (!hit) {
      this.aim = null;
      this.aimWorld = null;
      return false;
    }
    // strictly on the Earth's visible face: near the rim, pull the aim back toward the viewer
    const n = hit.sub(this.globe.position).normalize();
    const toCam = this.camera.position.clone().sub(this.globe.position).normalize();
    const d = n.dot(toCam);
    // exact: the jet's point on the shell must project within 90% of the Earth's silhouette
    const R = this.globe.scale.x;
    const D = this.camera.position.distanceTo(this.globe.position);
    const limit = 0.9 * Math.asin(Math.min(1, R / D));
    const toCentre = this.globe.position.clone().sub(this.camera.position).normalize();
    const angleOf = (dir: THREE.Vector3) => {
      const pt = this.globe.position.clone().addScaledVector(dir, 1.08 * R).sub(this.camera.position).normalize();
      return Math.acos(THREE.MathUtils.clamp(pt.dot(toCentre), -1, 1));
    };
    if (angleOf(n) > limit) {
      const tang = n.clone().addScaledVector(toCam, -d).normalize();
      // slide from the rim toward the viewer until it fits (binary search on the polar angle)
      let lo = 0;
      let hi = Math.acos(THREE.MathUtils.clamp(d, -1, 1));
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2;
        const dir = toCam.clone().multiplyScalar(Math.cos(mid)).addScaledVector(tang, Math.sin(mid));
        if (angleOf(dir) > limit) hi = mid;
        else lo = mid;
      }
      n.copy(toCam).multiplyScalar(Math.cos(lo)).addScaledVector(tang, Math.sin(lo));
    }
    this.aimWorld = n.clone();
    this.aim = n.transformDirection(this.gInv.copy(this.globe.matrixWorld).invert());
    return true;
  }

  /**
   * Home page helper: the touchdown pose for the seam bridge. A front facing
   * point on the orbital shell, up and right of centre, with the nose toward
   * the top of the screen. Canvas pixels: centre, wingspan, nose angle.
   */
  guideTouchdown() {
    if (!this.guide) return null;
    const td = this.touchdown();
    if (!td) return null;
    const r = this.globe.scale.x;
    const span = 2.9 * 0.05 * r;
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    const px = (v: THREE.Vector3) => {
      const p = v.clone().project(this.camera);
      return { x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h };
    };
    const side = new THREE.Vector3().crossVectors(td.head, td.n).normalize();
    const c = px(td.world);
    const a = px(td.world.clone().addScaledVector(side, -span / 2));
    const b = px(td.world.clone().addScaledVector(side, span / 2));
    const nose = px(td.world.clone().addScaledVector(td.head, 0.08 * r));
    return { x: c.x, y: c.y, span: Math.hypot(b.x - a.x, b.y - a.y), angle: Math.atan2(nose.y - c.y, nose.x - c.x) };
  }
  private touchdown() {
    this.globe.updateMatrixWorld();
    this.camera.updateMatrixWorld();
    this.gRay.setFromCamera(this.tdNdc, this.camera);
    this.gSphere.set(this.globe.position, 1.08 * this.globe.scale.x);
    const hit = this.gRay.ray.intersectSphere(this.gSphere, new THREE.Vector3());
    if (!hit) return null;
    const n = hit.clone().sub(this.globe.position).normalize();
    const up = this.camera.up.clone().applyQuaternion(this.camera.quaternion);
    const head = up.addScaledVector(n, -up.dot(n)).normalize();
    return { world: hit, n, head };
  }
  /** Home page helper: the bridge has landed; show the globe jet at the touchdown pose. */
  guidePlace() {
    const g = this.guide;
    if (!g) return;
    this.guideAllowed = true;
    if (g.visible) return;
    const queued = this.pendingFly;
    this.pendingFly = -1;
    if (this.guidePlaced && this.facing(g.position)) {
      // back to where it was when it lifted off
      g.visible = true;
      if (queued >= 0) this.guideFly(queued);
      return;
    }
    const td = this.touchdown();
    if (!td) return;
    const inv = this.gInv.copy(this.globe.matrixWorld).invert();
    this.gDir.copy(td.world).applyMatrix4(inv).normalize();
    this.gHead.copy(td.head).transformDirection(inv);
    this.gHead.addScaledVector(this.gDir, -this.gHead.dot(this.gDir)).normalize();
    g.position.copy(this.gDir).multiplyScalar(1.08);
    this.gM.lookAt(this.c.set(0, 0, 0), this.gHead, this.gDir);
    g.quaternion.setFromRotationMatrix(this.gM);
    this.guideCurve = null;
    this.aim = null;
    this.aimWorld = null;
    this.gHold = null;
    this.gBank = 0;
    if (this.vapor) this.vapor.pts.length = 0;
    g.visible = true;
    this.guidePlaced = true;
    if (queued >= 0) this.guideFly(queued);
  }
  /** Is a point on the globe (globe local) on the side facing the camera? */
  private facing(local: THREE.Vector3, min = 0.35) {
    this.globe.updateMatrixWorld();
    const wpos = local.clone().applyMatrix4(this.globe.matrixWorld);
    const n = wpos.clone().sub(this.globe.position).normalize();
    const toCam = this.camera.position.clone().sub(wpos).normalize();
    return n.dot(toCam) > min;
  }
  /**
   * Home page helper: the globe jet's own screen pose (canvas pixels), when it
   * has been on the globe and sits on the visible face. The bridge lifts off from here.
   */
  guidePose() {
    const g = this.guide;
    if (!g || !this.guidePlaced || !this.facing(g.position, 0.15)) return null;
    this.globe.updateMatrixWorld();
    this.camera.updateMatrixWorld();
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    const px = (v: THREE.Vector3) => {
      const p = v.clone().applyMatrix4(this.globe.matrixWorld).project(this.camera);
      return { x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h };
    };
    const n = g.position.clone().normalize();
    const head = this.gHead.clone().addScaledVector(n, -this.gHead.dot(n)).normalize();
    const side = new THREE.Vector3().crossVectors(head, n).normalize();
    const half = (2.9 * 0.05) / 2;
    const c = px(g.position);
    const a = px(g.position.clone().addScaledVector(side, -half));
    const b = px(g.position.clone().addScaledVector(side, half));
    const nose = px(g.position.clone().addScaledVector(head, 0.08));
    return { x: c.x, y: c.y, span: Math.hypot(b.x - a.x, b.y - a.y), angle: Math.atan2(nose.y - c.y, nose.x - c.x) };
  }
  /** Home page helper: is the globe's jet on screen? */
  get guideVisible() {
    return !!this.guide?.visible;
  }
  /** Home page helper: the bridge (or the hero) owns the jet; the globe jet steps aside. */
  guideHide() {
    this.guideAllowed = false;
    this.gHold = null;
    this.aimWorld = null;
    this.aim = null;
    this.guideCurve = null;
    if (this.guide) this.guide.visible = false;
    if (this.vapor) this.vapor.pts.length = 0;
  }

  /** Home page helper: glide up beside a country's beacon and hold there. */
  guideBeside(index: number) {
    if (!this.guide || !this.guide.visible || index < 0) return;
    const n = this.places[index].clone().normalize();
    const east = new THREE.Vector3(0, 1, 0).cross(n);
    if (east.lengthSq() < 1e-6) east.set(1, 0, 0);
    east.normalize();
    const north = n.clone().cross(east).normalize();
    this.aimWorld = null;
    this.aim = n.addScaledVector(east, 0.1).addScaledVector(north, -0.06).normalize();
  }

  /**
   * Home page helper: call once a frame with the frame time. If frames stay
   * slow for about a second, draw at a lower pixel ratio (never below 1).
   * Returns true when it changed.
   */
  adapt(frameMs: number) {
    if (frameMs > 200) return false;
    this.frameMs += (frameMs - this.frameMs) * 0.08;
    if (this.frameMs > 24 && this.dpr > 1) {
      this.slowFor += frameMs;
      if (this.slowFor > 1000) {
        this.dpr = Math.max(1, this.dpr - 0.25);
        this.capped = true;
        this.slowFor = 0;
        this.frameMs = 16.7;
        this.renderer.setPixelRatio(this.dpr);
        this.renderer.setSize(this.width, this.height, false);
        return true;
      }
    } else this.slowFor = 0;
    return false;
  }

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
