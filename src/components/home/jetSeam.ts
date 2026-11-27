/**
 * The seam between the hero and the globe: who owns the one jet on screen.
 *
 *   hero    inside the corridor, the hero scene draws the jet
 *   bridge  across the seam, a top layer canvas flies it from the hero to the globe
 *   globe   once it has landed, the globe's own jet takes over (cursor flight)
 *
 * Exactly one owner at a time, so there are never two jets and never none.
 * The hero and the globe register where their jet is on screen; the bridge
 * reads both every frame and sets the owner.
 */
export type JetOwner = 'hero' | 'bridge' | 'globe';

/** A jet on screen, in viewport pixels: centre, wingspan in pixels, and heading. */
export interface JetPose {
  x: number;
  y: number;
  span: number;
  /** hero only: the jet's orientation relative to a camera looking down -Z */
  q?: { x: number; y: number; z: number; w: number };
  /** globe only: the nose direction on screen, in radians (y down) */
  angle?: number;
}

type Listener = (o: JetOwner) => void;

class Seam {
  owner: JetOwner = 'hero';
  /** the hero jet's live pose (null while the hero scene is not ready) */
  hero: (() => JetPose | null) | null = null;
  /** the globe's touchdown pose: where its jet appears when the bridge lands */
  globe: (() => JetPose | null) | null = null;
  private listeners = new Set<Listener>();
  set(o: JetOwner) {
    if (o === this.owner) return;
    this.owner = o;
    this.listeners.forEach((f) => f(o));
  }
  subscribe(f: Listener) {
    this.listeners.add(f);
    f(this.owner);
    return () => {
      this.listeners.delete(f);
    };
  }
}

export const jetSeam = new Seam();
