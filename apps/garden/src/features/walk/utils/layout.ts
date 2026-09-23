import type { Point } from '@/types/garden';

/**
 * From the traced plan to the ground of the 3D garden.
 *
 * The plan is normalised 0..1 on both axes with no metres attached, so two
 * things have to be supplied from outside: how wide the garden really is, and
 * the aspect ratio of the plan photo (without it a square plan would squash a
 * long garden into a square one). Given those, plan x runs along world x and
 * plan y — which grows *down* the image — runs along world +z, so the plan is
 * laid on the ground exactly as it reads on screen when seen from above.
 */
export interface PlanFrame {
  /** Real width of the plan's full extent, in metres. */
  widthM: number;
  /** Real depth of the plan's full extent, in metres. */
  depthM: number;
}

export function makeFrame(widthM: number, aspect: number): PlanFrame {
  return { widthM, depthM: widthM * aspect };
}

/** A plan point to ground coordinates, centred on the origin. */
export function toWorld(point: Point, frame: PlanFrame): [number, number] {
  return [(point.x - 0.5) * frame.widthM, (point.y - 0.5) * frame.depthM];
}

/** Shoelace area of a polygon already in metres. */
export function polygonAreaM2(ring: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [ax, az] = ring[i];
    const [bx, bz] = ring[(i + 1) % ring.length];
    area += ax * bz - bx * az;
  }
  return Math.abs(area) / 2;
}

/** Even-odd rule. Points on an edge count as inside, which is fine here. */
export function pointInPolygon(x: number, z: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    const crosses = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/**
 * Small deterministic RNG (mulberry32), seeded from a string.
 *
 * Every plant gets a slight random lean and size so a row does not look
 * stamped, but the randomness must be stable: the same garden has to look the
 * same on every visit, and a reload must not reshuffle the beds under a visitor.
 */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Spots to plant inside a bed: a grid at the given spacing, jittered, kept to the
 * cells whose centre falls inside the polygon (shrunk by a margin so nothing
 * hangs over the border). An empty grid — a bed narrower than one spacing —
 * still gets one plant at its centre, because an occupied bed that renders empty
 * reads as a bug.
 */
export function scatterInPolygon(
  ring: [number, number][],
  spacingM: number,
  random: () => number,
  maxCount: number,
): [number, number][] {
  const xs = ring.map((p) => p[0]);
  const zs = ring.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);

  const margin = Math.min(spacingM * 0.4, 0.2);
  const spots: [number, number][] = [];
  for (let x = minX + spacingM / 2; x < maxX; x += spacingM) {
    for (let z = minZ + spacingM / 2; z < maxZ; z += spacingM) {
      const jx = x + (random() - 0.5) * spacingM * 0.4;
      const jz = z + (random() - 0.5) * spacingM * 0.4;
      if (
        pointInPolygon(jx, jz, ring) &&
        pointInPolygon(jx - margin, jz, ring) &&
        pointInPolygon(jx + margin, jz, ring) &&
        pointInPolygon(jx, jz - margin, ring) &&
        pointInPolygon(jx, jz + margin, ring)
      ) {
        spots.push([jx, jz]);
      }
    }
  }

  if (spots.length === 0) {
    const cx = xs.reduce((s, v) => s + v, 0) / xs.length;
    const cz = zs.reduce((s, v) => s + v, 0) / zs.length;
    return [[cx, cz]];
  }

  // Too many plants and the frame rate drops on a phone; thin the grid evenly
  // rather than truncating it, so the far end of a long row is not left bare.
  if (spots.length > maxCount) {
    const step = spots.length / maxCount;
    const thinned: [number, number][] = [];
    for (let i = 0; i < maxCount; i++) thinned.push(spots[Math.floor(i * step)]);
    return thinned;
  }
  return spots;
}
