import { useEffect, useRef, useState } from 'react';
import { CpcButton } from '@vigooth/ui';
import type { Point } from '@/types/garden';
import type { CropRect } from '@/utils/cropImage';
import { cropImage, cropSize } from '@/utils/cropImage';
import { normalisedPoint } from '@/utils/geometry';

interface PhotoCropperProps {
  file: File;
  onApply: (cropped: File) => void;
  onCancel: () => void;
}

/** Smaller than this and the drag was a slip, not a selection. */
const MIN_SIDE = 0.03;

/**
 * Draw a rectangle over the photo to keep only the plant.
 *
 * The 3D generators reconstruct whatever is in the frame; a tree that shares
 * the picture with a fence and half a house comes out as a lump of all three.
 * Cropping to the subject before anything else is the single biggest lever on
 * what the model looks like. One drag draws the box; another drag replaces it.
 */
export function PhotoCropper({ file, onApply, onCancel }: PhotoCropperProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [rect, setRect] = useState<CropRect | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    setRect(null);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const pointFrom = (event: React.PointerEvent): Point | null => {
    const bounds = surfaceRef.current?.getBoundingClientRect();
    return bounds ? normalisedPoint(event, bounds) : null;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = pointFrom(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setRect({ from: point, to: point });
    setDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const point = pointFrom(event);
    if (point) setRect((current) => (current ? { from: current.from, to: point } : current));
  };

  const handlePointerUp = () => {
    setDragging(false);
    setRect((current) => {
      if (!current) return null;
      const { width, height } = cropSize(current);
      return width < MIN_SIDE || height < MIN_SIDE ? null : current;
    });
  };

  const handleApply = async () => {
    if (!rect) return;
    setBusy(true);
    try {
      onApply(await cropImage(file, rect));
    } finally {
      setBusy(false);
    }
  };

  const box = rect
    ? {
        left: `${Math.min(rect.from.x, rect.to.x) * 100}%`,
        top: `${Math.min(rect.from.y, rect.to.y) * 100}%`,
        width: `${cropSize(rect).width * 100}%`,
        height: `${cropSize(rect).height * 100}%`,
      }
    : null;

  return (
    <div className="flex flex-col gap-2 border-2 border-cpc-yellow-500 p-2">
      <p className="text-xs text-cpc-yellow-500">
        RECADRAGE — trace un rectangle autour de la plante, sans le décor autour.
      </p>

      {/* The surface hugs the image exactly, so a fraction of the surface is a
          fraction of the photo — letterboxing would throw the crop off. */}
      <div
        ref={surfaceRef}
        className="relative w-fit max-w-full cursor-crosshair touch-none select-none overflow-hidden bg-black"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {url && (
          <img
            src={url}
            alt=""
            draggable={false}
            className="block h-auto max-h-[60vh] max-w-full"
          />
        )}
        {box && (
          // The oversized shadow dims everything outside the box, so the eye
          // reads what will be kept; the surface clips it.
          <div
            className="pointer-events-none absolute border-2 border-cpc-yellow-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
            style={box}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CpcButton
          type="button"
          variant="filled"
          color="yellow"
          size="xs"
          disabled={!rect || busy}
          onClick={handleApply}
        >
          {busy ? 'RECADRAGE...' : 'APPLIQUER'}
        </CpcButton>
        <CpcButton type="button" variant="text" color="red" size="xs" onClick={onCancel}>
          GARDER LA PHOTO ENTIERE
        </CpcButton>
        {rect && (
          <span className="text-[10px] text-cpc-green-900">
            {Math.round(cropSize(rect).width * 100)}% × {Math.round(cropSize(rect).height * 100)}%
            de l'image
          </span>
        )}
      </div>
    </div>
  );
}
