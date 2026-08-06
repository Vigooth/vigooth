/**
 * Normalise a picked image into the 2:1 equirectangular frame the renderer maps
 * onto the sphere.
 *
 * Two things make this worth doing in the browser rather than trusting the input:
 *
 * - Phone panoramas are wide but vertically short — a sweep might be 6:1. Stretched
 *   across a full sphere that looks like a funhouse mirror. Letterboxing it into a
 *   2:1 frame instead puts it back where it belongs: a band around the horizon,
 *   with empty sky above and ground below. That is what the shot actually captured.
 * - Power-of-two dimensions let the renderer wrap the texture horizontally, which
 *   is what hides the seam where the panorama meets itself.
 *
 * The horizontal sweep is still assumed to be a full 360°, which no phone records
 * in a way we can read back. A half-turn panorama will read as stretched — hence
 * the aspect ratio reported back, so the view can say so.
 */

/** Above this the texture costs more memory than the extra detail is worth. */
const MAX_WIDTH = 4096;
const MIN_WIDTH = 1024;

/** A frame this close to 2:1 is already equirectangular; anything else gets a note. */
const EQUIRECT_ASPECT_TOLERANCE = 0.15;

export interface PreparedPanorama {
  blob: Blob;
  /** Width over height of the *source*, so the caller can flag an odd shape. */
  sourceAspect: number;
  /** False when the source was not roughly 2:1 and had to be letterboxed. */
  wasEquirect: boolean;
}

/** Largest power of two that is not larger than `value`, within our bounds. */
function powerOfTwoWidth(value: number): number {
  const bounded = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));
  return 2 ** Math.floor(Math.log2(bounded));
}

export async function prepareEquirect(file: File, quality = 0.85): Promise<PreparedPanorama> {
  const bitmap = await createImageBitmap(file);
  try {
    const sourceAspect = bitmap.width / bitmap.height;
    const width = powerOfTwoWidth(bitmap.width);
    const height = width / 2;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');

    // Black rather than transparent: the sky and ground bands are part of the
    // picture once this is on the sphere, and JPEG has no alpha to fall back on.
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // The source always spans the full width — the sweep is taken to be 360° — and
    // is centred vertically, so the horizon stays at the horizon.
    const drawnHeight = width / sourceAspect;
    ctx.drawImage(bitmap, 0, (height - drawnHeight) / 2, width, drawnHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    if (!blob) throw new Error('Failed to encode the panorama');

    return {
      blob,
      sourceAspect,
      wasEquirect: Math.abs(sourceAspect - 2) <= EQUIRECT_ASPECT_TOLERANCE * 2,
    };
  } finally {
    // Bitmaps hold decoded pixels outside the JS heap; GC will not reclaim them.
    bitmap.close();
  }
}
