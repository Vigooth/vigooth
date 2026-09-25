import type { Point } from '@/types/garden';

/** A rectangle in normalised 0..1 image coordinates, corners in any order. */
export interface CropRect {
  from: Point;
  to: Point;
}

/** Width and height of the rectangle, as fractions of the image. */
export function cropSize(rect: CropRect): { width: number; height: number } {
  return {
    width: Math.abs(rect.to.x - rect.from.x),
    height: Math.abs(rect.to.y - rect.from.y),
  };
}

/**
 * Cut a rectangle out of a picked image and re-encode it as a JPEG file.
 *
 * This runs on the picked file, before downscaling: a tree that fills a third
 * of a 4000-pixel photo still comes out sharp, where cropping the downscaled
 * version would hand the 3D generator a few hundred blurry pixels.
 */
export async function cropImage(file: File, rect: CropRect, quality = 0.92): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const left = Math.round(Math.min(rect.from.x, rect.to.x) * bitmap.width);
    const top = Math.round(Math.min(rect.from.y, rect.to.y) * bitmap.height);
    const width = Math.max(1, Math.round(cropSize(rect).width * bitmap.width));
    const height = Math.max(1, Math.round(cropSize(rect).height * bitmap.height));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas context unavailable');
    context.drawImage(bitmap, left, top, width, height, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    if (!blob) throw new Error('Failed to encode the crop');

    const stem = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${stem}-recadre.jpg`, { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}
