import type { Point, Viewpoint } from '@/types/garden';

/**
 * Camera math for the 360° tour, shared by the WebGL renderer and the DOM
 * markers laid over it.
 *
 * Both sides must agree exactly on what "azimuth 1.2 rad" means on screen, or the
 * labels drift away from the things they name. Keeping the one convention here,
 * used by both, is what prevents that:
 *
 * - Camera space looks down -z, with +x right and +y up.
 * - A direction at azimuth `a` and elevation `e` is
 *   `(cos e · sin a, sin e, -cos e · cos a)`, so azimuth 0 is straight ahead at
 *   yaw 0 and grows to the right.
 * - The panorama's left seam is azimuth 0, so `u = azimuth / 2π`.
 * - `Viewpoint.heading_deg` is the plan bearing that seam points at, which is
 *   what ties this space to the plan's.
 */

const TAU = Math.PI * 2;

export interface Camera {
  /** Azimuth at the centre of the view, in radians. */
  yaw: number;
  /** Radians, positive looking up. */
  pitch: number;
  /** Vertical field of view, in radians. */
  fov: number;
}

/**
 * How high the camera stood, expressed as a fraction of the plan's width.
 *
 * The plan has no scale — it is normalised 0..1 with no metres attached — so the
 * tour cannot know how far below the horizon a bed three metres away should sit.
 * This is the one assumption that stands in for that: eye height at roughly 1.6 m
 * on a plan spanning roughly 25 m. It only sets how steeply nearby labels drop
 * towards the feet, so being off by a third is unnoticeable; what it buys is that
 * near beds read as near and far ones sit close to the horizon.
 */
const EYE_HEIGHT_IN_PLAN_UNITS = 0.064;

/** Markers a shade outside the frame still render, so they slide in rather than pop. */
const VISIBLE_NDC_MARGIN = 1.15;

export const MIN_FOV = (30 * Math.PI) / 180;
export const MAX_FOV = (110 * Math.PI) / 180;
/** Looking past the poles would flip the image, so the pitch stops short of them. */
export const MAX_PITCH = (85 * Math.PI) / 180;

/** Fold an angle into 0..2π. */
export function wrapAngle(radians: number): number {
  const folded = radians % TAU;
  return folded < 0 ? folded + TAU : folded;
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Bearing from one plan position to another, in radians.
 *
 * Measured from the plan's +x axis and growing towards +y — which points *down*,
 * since plan coordinates are image coordinates. That handedness is deliberate and
 * only has to stay consistent with `heading_deg`, which is measured the same way.
 */
export function planBearing(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function planDistance(from: Point, to: Point): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

/** Where a viewpoint stands on the plan, or null while it is unpinned. */
export function viewpointPosition(viewpoint: Viewpoint): Point | null {
  if (viewpoint.plan_x == null || viewpoint.plan_y == null) return null;
  return { x: viewpoint.plan_x, y: viewpoint.plan_y };
}

/**
 * Azimuth, inside the panorama, of a plan position seen from a viewpoint.
 *
 * Null when the viewpoint has no pin: without knowing where the camera stood
 * there is no bearing to compute, which is why an unpinned viewpoint shows its
 * panorama but no markers.
 */
export function azimuthFromViewpoint(viewpoint: Viewpoint, target: Point): number | null {
  const origin = viewpointPosition(viewpoint);
  if (!origin) return null;
  return wrapAngle(planBearing(origin, target) - degreesToRadians(viewpoint.heading_deg));
}

/**
 * How far below the horizon something standing on the ground appears.
 *
 * Distance is in plan units, so this leans on `EYE_HEIGHT_IN_PLAN_UNITS`. At zero
 * distance it looks straight down, which is the right answer for a bed underfoot.
 */
export function groundElevation(distance: number): number {
  return -Math.atan2(EYE_HEIGHT_IN_PLAN_UNITS, Math.max(distance, 1e-6));
}

export interface ProjectedMarker {
  /** Pixels from the left of the canvas. */
  x: number;
  /** Pixels from the top of the canvas. */
  y: number;
  /** False when the direction falls behind the camera or well outside the frame. */
  visible: boolean;
}

/**
 * Project a direction onto the canvas, inverting the same rotation the shader
 * applies. Returns `visible: false` rather than a null so callers can keep a
 * stable marker list across frames instead of remounting DOM on every turn.
 */
export function projectToScreen(
  azimuth: number,
  elevation: number,
  camera: Camera,
  width: number,
  height: number,
): ProjectedMarker {
  const cosElevation = Math.cos(elevation);
  const world = {
    x: cosElevation * Math.sin(azimuth),
    y: Math.sin(elevation),
    z: -cosElevation * Math.cos(azimuth),
  };

  // Undo the camera's yaw, then its pitch — the reverse of how the shader builds
  // the ray, so a direction at the camera's own yaw/pitch lands dead centre.
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const unyawedX = world.x * cosYaw + world.z * sinYaw;
  const unyawedZ = -world.x * sinYaw + world.z * cosYaw;

  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const cameraY = world.y * cosPitch + unyawedZ * sinPitch;
  const cameraZ = -world.y * sinPitch + unyawedZ * cosPitch;

  // Anything at or behind the plane of the lens has no projection.
  if (cameraZ >= -1e-6) return { x: 0, y: 0, visible: false };

  const aspect = height > 0 ? width / height : 1;
  const tanHalfFov = Math.tan(camera.fov / 2);
  const depth = -cameraZ;
  const ndcX = unyawedX / depth / (tanHalfFov * aspect);
  const ndcY = cameraY / depth / tanHalfFov;

  return {
    x: ((ndcX + 1) / 2) * width,
    y: ((1 - ndcY) / 2) * height,
    visible: Math.abs(ndcX) <= VISIBLE_NDC_MARGIN && Math.abs(ndcY) <= VISIBLE_NDC_MARGIN,
  };
}

/**
 * Yaw that centres a given azimuth, taking the short way round.
 *
 * Used when arriving at a viewpoint: the tour points the camera back towards the
 * one it came from, so the visitor keeps their bearings instead of being dropped
 * facing an arbitrary direction.
 */
export function yawTowards(azimuth: number): number {
  return wrapAngle(azimuth);
}
