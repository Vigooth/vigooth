/**
 * Re-encode a picked image down to a sane size before it ever leaves the browser.
 *
 * Phone photos run 4–12 MB, and the tracer samples the image down to a grid a
 * couple of hundred pixels wide anyway — the extra resolution buys nothing and
 * every byte of it would land in a database row. Downscaling here is what keeps
 * the server's 4 MiB ceiling a formality rather than a wall users hit.
 */
export async function downscaleImage(
  file: File,
  maxSide = 1600,
  quality = 0.82,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    if (!blob) throw new Error('Failed to encode the image');
    return blob;
  } finally {
    // Bitmaps hold decoded pixels outside the JS heap; GC will not reclaim them.
    bitmap.close();
  }
}
