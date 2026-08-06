/**
 * Normalise a picked image into the 2:1 equirectangular frame the renderer maps
 * onto the sphere.
 *
 * The hard part is not the resizing, it is knowing *how much of the sphere the
 * photo actually covers*. A phone's Panorama mode sweeps maybe 200° across and
 * only ~65° up and down; painted over a whole sphere that is stretched by nearly
 * a factor of two, and no amount of calibrating the heading can fix it, because
 * the error is a scale and not an offset. So the photo is inset into the frame at
 * its true angular size, with black where the camera saw nothing.
 *
 * Coverage is established in three ways, best first:
 *
 * 1. GPano XMP metadata, which Android panorama and photo-sphere apps write. It
 *    states the crop's exact position inside the full sphere — no guessing.
 * 2. A 2:1 frame with no metadata, taken at face value as a full 360°×180°
 *    equirectangular, which is what 360° cameras and stitchers produce.
 * 3. Otherwise, estimated from the aspect ratio against a phone's vertical field
 *    of view. Approximate, but far closer than assuming a full turn.
 *
 * Power-of-two dimensions let the renderer wrap the texture horizontally, which
 * is what hides the seam where the panorama meets itself.
 */

/** Above this the texture costs more memory than the extra detail is worth. */
const MAX_WIDTH = 4096;
const MIN_WIDTH = 1024;

/** A frame this close to 2:1 is taken to be a full equirectangular already. */
const EQUIRECT_ASPECT_TOLERANCE = 0.3;

/**
 * Vertical field of view assumed for a phone panorama, in degrees.
 *
 * A sweep keeps one frame's vertical extent throughout, so this is just the rear
 * camera's vertical angle of view in portrait — around 65° across current phones.
 * Combined with the aspect ratio it yields the horizontal sweep: a 3:1 strip
 * covers about 195°, a 5.5:1 one about a full turn.
 */
const ASSUMED_PHONE_VERTICAL_FOV = 65;

/** How the source was fitted into the sphere, so the view can say what it did. */
export interface Placement {
  basis: 'gpano' | 'equirect' | 'estimated';
  horizontalCoverage: number;
  verticalCoverage: number;
}

export interface PreparedPanorama {
  blob: Blob;
  placement: Placement;
}

/** The subset of GPano that says where a crop sits inside the full sphere. */
interface GPanoCrop {
  fullWidth: number;
  fullHeight: number;
  croppedWidth: number;
  croppedHeight: number;
  left: number;
  top: number;
}

/** Largest power of two that is not larger than `value`, within our bounds. */
function powerOfTwoWidth(value: number): number {
  const bounded = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));
  return 2 ** Math.floor(Math.log2(bounded));
}

/**
 * Read GPano fields out of the file's XMP packet.
 *
 * XMP rides in an APP1 segment near the front of a JPEG, so only the head is read
 * rather than the whole photo. Values appear either as attributes or as elements
 * depending on the writer, hence the loose separator match.
 */
async function readGPanoCrop(file: File): Promise<GPanoCrop | null> {
  const head = await file.slice(0, 512 * 1024).arrayBuffer();
  // latin1 maps every byte to exactly one code unit, so nothing fails to decode
  // and no multi-byte sequence can swallow the marker being searched for.
  const text = new TextDecoder('latin1').decode(head);
  const start = text.indexOf('http://ns.adobe.com/xap/1.0/');
  if (start === -1) return null;

  const packet = text.slice(start, start + 32768);
  const read = (field: string): number | null => {
    const match = packet.match(new RegExp(`GPano:${field}["'>=\\s]*(\\d+)`));
    if (!match) return null;
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : null;
  };

  const fullWidth = read('FullPanoWidthPixels');
  const fullHeight = read('FullPanoHeightPixels');
  const croppedWidth = read('CroppedAreaImageWidthPixels');
  const croppedHeight = read('CroppedAreaImageHeightPixels');
  // All four are needed to place the crop; a partial set is not worth trusting.
  if (!fullWidth || !fullHeight || !croppedWidth || !croppedHeight) return null;

  return {
    fullWidth,
    fullHeight,
    croppedWidth,
    croppedHeight,
    // Absent means the crop starts at the origin, which is a legitimate 0.
    left: read('CroppedAreaLeftPixels') ?? 0,
    top: read('CroppedAreaTopPixels') ?? 0,
  };
}

/** Where to draw the source inside the target frame, in target pixels. */
interface DrawRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Fitted {
  rect: DrawRect;
  placement: Placement;
}

/** Exact placement: GPano states the crop's position in the full sphere outright. */
function fitFromGPano(crop: GPanoCrop, width: number, height: number): Fitted {
  return {
    rect: {
      x: (crop.left / crop.fullWidth) * width,
      y: (crop.top / crop.fullHeight) * height,
      width: (crop.croppedWidth / crop.fullWidth) * width,
      height: (crop.croppedHeight / crop.fullHeight) * height,
    },
    placement: {
      basis: 'gpano',
      horizontalCoverage: (crop.croppedWidth / crop.fullWidth) * 360,
      verticalCoverage: (crop.croppedHeight / crop.fullHeight) * 180,
    },
  };
}

/**
 * Fit a strip of unknown provenance, centred on the horizon.
 *
 * The drawn rectangle keeps the source's aspect ratio by construction: both sides
 * come from the same degrees-per-pixel, so nothing is squashed — the photo simply
 * occupies the slice of sphere it actually saw.
 */
function fitFromAspect(sourceAspect: number, width: number, height: number): Fitted {
  const isEquirect = Math.abs(sourceAspect - 2) <= EQUIRECT_ASPECT_TOLERANCE;
  let verticalCoverage = isEquirect ? 180 : ASSUMED_PHONE_VERTICAL_FOV;
  let horizontalCoverage = sourceAspect * verticalCoverage;

  // Past a full turn the assumed vertical field of view is simply wrong — a strip
  // that wide went all the way round, so the aspect ratio is the better witness
  // and it fixes the height instead. Clamping the width alone would squash the
  // photo, which is the very distortion this whole function exists to avoid.
  if (horizontalCoverage > 360) {
    horizontalCoverage = 360;
    verticalCoverage = 360 / sourceAspect;
  }

  const drawnWidth = (horizontalCoverage / 360) * width;
  const drawnHeight = (verticalCoverage / 180) * height;

  return {
    rect: {
      x: (width - drawnWidth) / 2,
      y: (height - drawnHeight) / 2,
      width: drawnWidth,
      height: drawnHeight,
    },
    placement: {
      basis: isEquirect ? 'equirect' : 'estimated',
      horizontalCoverage,
      verticalCoverage,
    },
  };
}

export async function prepareEquirect(file: File, quality = 0.85): Promise<PreparedPanorama> {
  // Metadata is read from the file, not the bitmap: decoding discards it.
  const crop = await readGPanoCrop(file);
  const bitmap = await createImageBitmap(file);

  try {
    const width = powerOfTwoWidth(bitmap.width);
    const height = width / 2;

    const { rect, placement } = crop
      ? fitFromGPano(crop, width, height)
      : fitFromAspect(bitmap.width / bitmap.height, width, height);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');

    // Black rather than transparent: the unseen sky and ground are part of the
    // picture once this is on the sphere, and JPEG has no alpha to fall back on.
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    if (!blob) throw new Error('Failed to encode the panorama');

    return { blob, placement };
  } finally {
    // Bitmaps hold decoded pixels outside the JS heap; GC will not reclaim them.
    bitmap.close();
  }
}
