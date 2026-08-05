export interface Point {
  x: number;
  y: number;
}

export interface LuminanceField {
  values: Float32Array;
  width: number;
  height: number;
}

export interface TraceOptions {
  /** Number of intensity bands. 4–6 reads as screen-print; beyond ~8 it muddies. */
  levels: number;
  /** Douglas-Peucker tolerance, in grid units. Higher = fewer, straighter points. */
  simplify: number;
  /** Chaikin rounding passes. 0 keeps the stair-steps, 2 is generously curved. */
  smoothing: number;
}

export interface Band {
  /** Luminance cut this band was traced at, 0..1. */
  threshold: number;
  /** SVG path data in grid coordinates. */
  d: string;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Reduce an image to a luminance grid, longest side capped at `maxSide`.
 *
 * The grid keeps the image's own aspect ratio rather than the container's, so
 * tracing runs once per image and a resize never re-traces — the SVG viewBox
 * absorbs the difference.
 */
export function sampleLuminance(image: HTMLImageElement, maxSide: number): LuminanceField | null {
  const ratio = image.naturalWidth / image.naturalHeight;
  const width = Math.max(2, Math.round(ratio >= 1 ? maxSide : maxSide * ratio));
  const height = Math.max(2, Math.round(ratio >= 1 ? maxSide / ratio : maxSide));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, width, height);

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, width, height).data;
  } catch {
    // Cross-origin image without CORS headers taints the canvas; there is no
    // luminance to read and therefore nothing to trace.
    return null;
  }

  const values = new Float32Array(width * height);
  for (let index = 0; index < values.length; index++) {
    const offset = index * 4;
    values[index] =
      (0.2126 * pixels[offset] + 0.7152 * pixels[offset + 1] + 0.0722 * pixels[offset + 2]) / 255;
  }
  return { values, width, height };
}

/** Normalise a field onto its own full 0..1 range, then apply a tone curve. */
function stretchContrast(field: LuminanceField, gamma: number): Float32Array {
  const { values } = field;
  let min = 1;
  let max = 0;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const span = max - min;
  const out = new Float32Array(values.length);
  for (let index = 0; index < values.length; index++) {
    const normalised = span > 0.001 ? (values[index] - min) / span : values[index];
    out[index] = clamp01(normalised) ** gamma;
  }
  return out;
}

/**
 * Marching-squares segment table, indexed by which corners sit above the
 * threshold: `TL=1, TR=2, BR=4, BL=8`. Edges are named for the cell side they
 * cross — T, R, B, L.
 *
 * Every segment is oriented so the above-threshold side falls on its left. That
 * orientation is what makes holes work: an island's boundary and the boundary
 * of a gap inside it come out wound in opposite directions, so `fill-rule:
 * nonzero` punches the gap out on its own, with no hole bookkeeping here.
 *
 * Cases 5 and 10 are the ambiguous saddles. They are resolved as two separate
 * corner clips rather than a join — the choice is arbitrary at this resolution
 * and the disconnected reading keeps thin features from fusing.
 */
type EdgeName = 'T' | 'R' | 'B' | 'L';
const SEGMENT_TABLE: readonly (readonly [EdgeName, EdgeName][])[] = [
  [],
  [['T', 'L']],
  [['R', 'T']],
  [['R', 'L']],
  [['B', 'R']],
  [
    ['T', 'L'],
    ['B', 'R'],
  ],
  [['B', 'T']],
  [['B', 'L']],
  [['L', 'B']],
  [['T', 'B']],
  [
    ['R', 'T'],
    ['L', 'B'],
  ],
  [['R', 'B']],
  [['L', 'R']],
  [['T', 'R']],
  [['L', 'T']],
  [],
];

const pointKey = (point: Point) => `${point.x.toFixed(4)},${point.y.toFixed(4)}`;

/** Walk one threshold and stitch its segments into closed rings. */
function traceLevel(
  values: Float32Array,
  width: number,
  height: number,
  threshold: number,
): Point[][] {
  // Reading -1 outside the grid is a virtual border of "below threshold". It
  // costs nothing and guarantees every contour closes, so the stitcher never
  // has to special-case a ring that runs off an edge.
  const at = (x: number, y: number) =>
    x < 0 || y < 0 || x >= width || y >= height ? -1 : values[y * width + x];

  const froms: Point[] = [];
  const tos: Point[] = [];

  for (let y = -1; y < height; y++) {
    for (let x = -1; x < width; x++) {
      const a = at(x, y);
      const b = at(x + 1, y);
      const c = at(x + 1, y + 1);
      const d = at(x, y + 1);

      const index =
        (a >= threshold ? 1 : 0) |
        (b >= threshold ? 2 : 0) |
        (c >= threshold ? 4 : 0) |
        (d >= threshold ? 8 : 0);
      const segments = SEGMENT_TABLE[index];
      if (segments.length === 0) continue;

      const cross = (v0: number, v1: number) =>
        v1 === v0 ? 0.5 : clamp01((threshold - v0) / (v1 - v0));
      const edgePoint = (edge: EdgeName): Point => {
        if (edge === 'T') return { x: x + cross(a, b), y };
        if (edge === 'R') return { x: x + 1, y: y + cross(b, c) };
        if (edge === 'B') return { x: x + cross(d, c), y: y + 1 };
        return { x, y: y + cross(a, d) };
      };

      for (const [from, to] of segments) {
        froms.push(edgePoint(from));
        tos.push(edgePoint(to));
      }
    }
  }

  const byStart = new Map<string, number[]>();
  for (let index = 0; index < froms.length; index++) {
    const key = pointKey(froms[index]);
    const bucket = byStart.get(key);
    if (bucket) {
      bucket.push(index);
    } else {
      byStart.set(key, [index]);
    }
  }

  const used = new Uint8Array(froms.length);
  const rings: Point[][] = [];

  for (let seed = 0; seed < froms.length; seed++) {
    if (used[seed]) continue;
    const ring: Point[] = [froms[seed]];
    let current = seed;
    while (current !== -1 && !used[current]) {
      used[current] = 1;
      ring.push(tos[current]);
      const candidates = byStart.get(pointKey(tos[current]));
      const next = candidates?.find((candidate) => !used[candidate]);
      current = next === undefined ? -1 : next;
    }
    // Fewer than three distinct points cannot enclose area.
    if (ring.length >= 4) rings.push(ring);
  }

  return rings;
}

/** Douglas-Peucker, applied to a closed ring. */
function simplifyRing(ring: Point[], tolerance: number): Point[] {
  if (tolerance <= 0 || ring.length < 4) return ring;

  const squaredTolerance = tolerance * tolerance;
  const keep = new Uint8Array(ring.length);
  keep[0] = 1;
  keep[ring.length - 1] = 1;

  const stack: [number, number][] = [[0, ring.length - 1]];
  while (stack.length > 0) {
    const span = stack.pop();
    if (!span) break;
    const [start, end] = span;
    const from = ring[start];
    const to = ring[end];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lengthSquared = dx * dx + dy * dy;

    let worst = -1;
    let worstDistance = 0;
    for (let index = start + 1; index < end; index++) {
      const point = ring[index];
      let distance: number;
      if (lengthSquared === 0) {
        distance = (point.x - from.x) ** 2 + (point.y - from.y) ** 2;
      } else {
        const t = clamp01(((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared);
        distance = (point.x - (from.x + t * dx)) ** 2 + (point.y - (from.y + t * dy)) ** 2;
      }
      if (distance > worstDistance) {
        worstDistance = distance;
        worst = index;
      }
    }

    if (worst !== -1 && worstDistance > squaredTolerance) {
      keep[worst] = 1;
      stack.push([start, worst], [worst, end]);
    }
  }

  return ring.filter((_, index) => keep[index] === 1);
}

/** Chaikin corner-cutting on a closed ring: each pass halves the angularity. */
function smoothRing(ring: Point[], passes: number): Point[] {
  let current = ring;
  for (let pass = 0; pass < passes; pass++) {
    if (current.length < 4) break;
    const next: Point[] = [];
    for (let index = 0; index < current.length; index++) {
      const a = current[index];
      const b = current[(index + 1) % current.length];
      next.push(
        { x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 },
        { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 },
      );
    }
    current = next;
  }
  return current;
}

const formatRing = (ring: Point[]) => {
  const head = ring[0];
  let d = `M${head.x.toFixed(2)},${head.y.toFixed(2)}`;
  for (let index = 1; index < ring.length; index++) {
    d += `L${ring[index].x.toFixed(2)},${ring[index].y.toFixed(2)}`;
  }
  return `${d}Z`;
};

/**
 * Trace an image's luminance into stacked, filled intensity bands.
 *
 * Bands come back darkest-threshold first, and each is a superset of the next:
 * `{lum >= t}` shrinks as `t` climbs, so painting them in order — no clipping,
 * no compositing — posterises the image correctly. That nesting is the whole
 * reason filled bands are cheap to render.
 */
export function traceBands(
  field: LuminanceField,
  options: TraceOptions & { gamma: number },
): Band[] {
  const values = stretchContrast(field, options.gamma);
  const { width, height } = field;
  const bands: Band[] = [];

  for (let level = 1; level <= options.levels; level++) {
    const threshold = level / (options.levels + 1);
    const rings = traceLevel(values, width, height, threshold)
      .map((ring) => simplifyRing(ring, options.simplify))
      .map((ring) => smoothRing(ring, options.smoothing))
      .filter((ring) => ring.length >= 3);
    if (rings.length === 0) continue;
    bands.push({ threshold, d: rings.map(formatRing).join('') });
  }

  return bands;
}
