import type { Document, Texture } from '@gltf-transform/core';
import { WebIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, simplify, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer/simplifier';

/**
 * Bring an uploaded .glb down to a weight the walk can afford, in the browser,
 * before it is sent.
 *
 * Photogrammetry scans and store models arrive at hundreds of thousands of
 * triangles with 4K textures. One of those in the walk is fine; a bed of
 * twenty is not, and a phone gives up. So the mesh is simplified towards a
 * triangle budget with meshoptimizer — which keeps UVs, so textures still
 * fit — and textures are resized down to a ceiling. Anything already under
 * both limits passes through untouched.
 */

/** Triangles a plant model may keep. Around what Meshy remeshes to. */
export const TRIANGLE_BUDGET = 30_000;
/** Longest side of a texture, in pixels. */
export const TEXTURE_MAX_PX = 1024;

export interface OptimizeReport {
  trianglesBefore: number;
  trianglesAfter: number;
  bytesBefore: number;
  bytesAfter: number;
  texturesResized: number;
}

export interface OptimizedGlb {
  blob: Blob;
  report: OptimizeReport;
}

function countTriangles(document: Document): number {
  let triangles = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const indices = primitive.getIndices();
      const count = indices
        ? indices.getCount()
        : (primitive.getAttribute('POSITION')?.getCount() ?? 0);
      triangles += Math.floor(count / 3);
    }
  }
  return triangles;
}

/** Decode, shrink and re-encode one texture on a canvas. Returns false if left alone. */
async function shrinkTexture(texture: Texture): Promise<boolean> {
  const image = texture.getImage();
  const size = texture.getSize();
  if (!image || !size) return false;
  const [width, height] = size;
  const longest = Math.max(width, height);
  if (longest <= TEXTURE_MAX_PX) return false;

  const scale = TEXTURE_MAX_PX / longest;
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const mimeType = texture.getMimeType() || 'image/png';
  const bitmap = await createImageBitmap(new Blob([image], { type: mimeType }));
  try {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) return false;
    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    // JPEG for colour maps that carried no alpha, PNG otherwise: a JPEG base
    // colour with lost alpha would punch holes where leaves were cut out.
    const keepPng = mimeType === 'image/png' && hasTransparency(context, targetWidth, targetHeight);
    const outType = keepPng ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outType, outType === 'image/jpeg' ? 0.85 : undefined),
    );
    if (!blob) return false;

    texture.setImage(new Uint8Array(await blob.arrayBuffer()));
    texture.setMimeType(outType);
    return true;
  } finally {
    bitmap.close();
  }
}

/** Sample the alpha channel coarsely; a full read of a 1K texture is not worth it. */
function hasTransparency(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): boolean {
  const step = Math.max(1, Math.floor(Math.min(width, height) / 64));
  const data = context.getImageData(0, 0, width, height).data;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (data[(y * width + x) * 4 + 3] < 250) return true;
    }
  }
  return false;
}

export async function optimizeGlb(file: Blob): Promise<OptimizedGlb> {
  const io = new WebIO().registerExtensions(ALL_EXTENSIONS);
  const source = new Uint8Array(await file.arrayBuffer());
  const document = await io.readBinary(source);

  const trianglesBefore = countTriangles(document);
  let trianglesAfter = trianglesBefore;

  if (trianglesBefore > TRIANGLE_BUDGET) {
    await MeshoptSimplifier.ready;
    await document.transform(
      dedup(),
      weld(),
      simplify({
        simplifier: MeshoptSimplifier,
        ratio: TRIANGLE_BUDGET / trianglesBefore,
        // A loose error bound: the goal is the budget, and a plant seen from
        // two metres away forgives a lot more than a hero prop would.
        error: 0.01,
      }),
      prune(),
    );
    trianglesAfter = countTriangles(document);
  }

  let texturesResized = 0;
  for (const texture of document.getRoot().listTextures()) {
    if (await shrinkTexture(texture)) texturesResized++;
  }

  // Nothing changed: hand the original bytes back rather than a re-encoding.
  if (trianglesAfter === trianglesBefore && texturesResized === 0) {
    return {
      blob: file,
      report: {
        trianglesBefore,
        trianglesAfter,
        bytesBefore: file.size,
        bytesAfter: file.size,
        texturesResized: 0,
      },
    };
  }

  const output = await io.writeBinary(document);
  const blob = new Blob([output], { type: 'model/gltf-binary' });
  return {
    blob,
    report: {
      trianglesBefore,
      trianglesAfter,
      bytesBefore: file.size,
      bytesAfter: blob.size,
      texturesResized,
    },
  };
}
