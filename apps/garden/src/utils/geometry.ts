import type { Point } from '@/types/garden';

/** Normalised 0..1 vertex to the 0..100 viewBox the plan overlay uses. */
const scalePoint = (point: Point) =>
  `${(point.x * 100).toFixed(2)},${(point.y * 100).toFixed(2)}`;

/** `d` for a closed polygon in normalised 0..1 coordinates, scaled to 0..100. */
export function polygonPath(shape: Point[]): string {
  if (shape.length < 3) return '';
  const [head, ...rest] = shape;
  return `M${scalePoint(head)}${rest.map((point) => `L${scalePoint(point)}`).join('')}Z`;
}

/** Shoelace centroid, for placing a label inside the shape. */
export function polygonCentroid(shape: Point[]): Point {
  if (shape.length === 0) return { x: 0.5, y: 0.5 };
  if (shape.length < 3) {
    return {
      x: shape.reduce((sum, p) => sum + p.x, 0) / shape.length,
      y: shape.reduce((sum, p) => sum + p.y, 0) / shape.length,
    };
  }

  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < shape.length; i++) {
    const a = shape[i];
    const b = shape[(i + 1) % shape.length];
    const cross = a.x * b.y - b.x * a.y;
    area += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  area /= 2;

  // Degenerate ring (zero area, e.g. all points collinear): fall back to the
  // vertex average rather than dividing by zero.
  if (Math.abs(area) < 1e-9) {
    return {
      x: shape.reduce((sum, p) => sum + p.x, 0) / shape.length,
      y: shape.reduce((sum, p) => sum + p.y, 0) / shape.length,
    };
  }

  return { x: cx / (6 * area), y: cy / (6 * area) };
}

/** Clamp a pointer position to the 0..1 box the shapes live in. */
export function normalisedPoint(
  event: { clientX: number; clientY: number },
  bounds: DOMRect,
): Point {
  return {
    x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
    y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
  };
}
