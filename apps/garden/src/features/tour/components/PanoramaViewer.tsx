import { useCallback, useEffect, useRef } from 'react';
import type { Camera } from '../utils/panorama';
import { MAX_FOV, MAX_PITCH, MIN_FOV, clamp, projectToScreen, wrapAngle } from '../utils/panorama';
import { createEquirectRenderer } from '../utils/equirectRenderer';
import type { EquirectRenderer } from '../utils/equirectRenderer';

export interface TourMarker {
  id: string;
  label: string;
  sublabel?: string;
  /** Azimuth inside the panorama, in radians. */
  azimuth: number;
  /** Radians, negative below the horizon. */
  elevation: number;
  /** Beds are labels; viewpoints are the way to walk somewhere else. */
  kind: 'bed' | 'viewpoint';
  onActivate?: () => void;
}

export interface ViewerApi {
  getCamera: () => Camera;
  lookAt: (yaw: number) => void;
}

interface PanoramaViewerProps {
  /** Blob URL of the panorama. Changing it swaps the texture in place. */
  panoramaUrl: string;
  markers: TourMarker[];
  /** Azimuth to face on arrival, so a visitor keeps their bearings. */
  initialYaw?: number;
  /** Handed an imperative handle — the camera lives outside React, see below. */
  onReady?: (api: ViewerApi) => void;
  onError?: (message: string) => void;
}

const DEFAULT_FOV = (75 * Math.PI) / 180;

/**
 * The panorama, its controls, and the markers laid over it.
 *
 * The camera deliberately lives in a ref rather than in state: it changes every
 * frame while dragging, and putting it in state would re-render this component
 * and every marker sixty times a second. The render loop writes the canvas and
 * then positions each marker element directly, so a drag touches no React state
 * at all — the marker *list* is React's, the marker *positions* are not.
 */
export function PanoramaViewer({
  panoramaUrl,
  markers,
  initialYaw = 0,
  onReady,
  onError,
}: PanoramaViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<EquirectRenderer | null>(null);
  const cameraRef = useRef<Camera>({ yaw: initialYaw, pitch: 0, fov: DEFAULT_FOV });
  const markerRefs = useRef(new Map<string, HTMLElement>());

  // Read inside the render loop, which must not restart when the list changes.
  const markersRef = useRef(markers);
  markersRef.current = markers;

  // Pointers currently down, for drag and pinch. A Map keyed by pointer id is what
  // lets a second finger arrive mid-drag without losing the first.
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistanceRef = useRef<number | null>(null);

  // Set up WebGL once and drive the frame loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const result = createEquirectRenderer(canvas);
    if ('error' in result) {
      onError?.(result.error);
      return;
    }
    const { renderer } = result;
    rendererRef.current = renderer;

    let frame = 0;
    const loop = () => {
      renderer.render(cameraRef.current);
      positionMarkers(canvas, markersRef.current, markerRefs.current, cameraRef.current);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [onError]);

  // Load and upload the panorama. Re-runs on every swap between viewpoints.
  useEffect(() => {
    const image = new Image();
    const controller = new AbortController();

    image.addEventListener(
      'load',
      () => {
        rendererRef.current?.setPanorama(image);
      },
      { signal: controller.signal },
    );
    image.addEventListener(
      'error',
      () => {
        onError?.('Panorama illisible');
      },
      { signal: controller.signal },
    );
    image.src = panoramaUrl;

    // Aborting drops both listeners, so a panorama that finishes decoding after
    // the visitor has already walked on cannot overwrite the new one's texture.
    return () => {
      controller.abort();
    };
  }, [panoramaUrl, onError]);

  // Point the camera at the arrival bearing whenever the tour moves.
  useEffect(() => {
    cameraRef.current.yaw = wrapAngle(initialYaw);
    cameraRef.current.pitch = 0;
  }, [initialYaw]);

  useEffect(() => {
    onReady?.({
      getCamera: () => ({ ...cameraRef.current }),
      lookAt: (yaw: number) => {
        cameraRef.current.yaw = wrapAngle(yaw);
      },
    });
  }, [onReady]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Capture so a drag that leaves the canvas keeps turning the view instead of
    // stopping dead at the edge.
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;

    if (pointers.size >= 2) {
      handlePinch(pointers, pinchDistanceRef, cameraRef);
      return;
    }

    const camera = cameraRef.current;
    const aspect = bounds.width / bounds.height;
    // Scaled by the field of view so a drag moves the picture under the finger by
    // the same amount whether zoomed in or out.
    const deltaX = event.clientX - previous.x;
    const deltaY = event.clientY - previous.y;
    camera.yaw = wrapAngle(camera.yaw - (deltaX / bounds.width) * camera.fov * aspect);
    camera.pitch = clamp(
      camera.pitch + (deltaY / bounds.height) * camera.fov,
      -MAX_PITCH,
      MAX_PITCH,
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchDistanceRef.current = null;
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const camera = cameraRef.current;
    camera.fov = clamp(camera.fov * Math.exp(event.deltaY * 0.001), MIN_FOV, MAX_FOV);
  };

  const registerMarker = useCallback((id: string, element: HTMLElement | null) => {
    if (element) markerRefs.current.set(id, element);
    else markerRefs.current.delete(id);
  }, []);

  return (
    <div
      ref={containerRef}
      // `touch-none` is what stops a drag from scrolling the page instead of
      // turning the view — and keeps the canvas from ever widening the document.
      className="relative aspect-[4/3] w-full touch-none overflow-hidden border-2 border-cpc-green-500 select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} className="h-full w-full cursor-grab active:cursor-grabbing" />

      {markers.map((marker) => (
        <MarkerLabel key={marker.id} marker={marker} register={registerMarker} />
      ))}
    </div>
  );
}

interface MarkerLabelProps {
  marker: TourMarker;
  register: (id: string, element: HTMLElement | null) => void;
}

/**
 * One overlay label. Position is written by the render loop, not by React, so
 * nothing here re-renders while the view turns.
 */
function MarkerLabel({ marker, register }: MarkerLabelProps) {
  const isViewpoint = marker.kind === 'viewpoint';

  const handleRef = useCallback(
    (element: HTMLDivElement | null) => {
      register(marker.id, element);
    },
    [marker.id, register],
  );

  const handleClick = () => {
    marker.onActivate?.();
  };

  return (
    <div
      ref={handleRef}
      // Hidden until the loop has placed it, so a fresh marker cannot flash at 0,0.
      style={{ display: 'none' }}
      className="pointer-events-none absolute top-0 left-0 z-10"
    >
      <div className="-translate-x-1/2 -translate-y-1/2">
        {isViewpoint ? (
          <button
            type="button"
            onClick={handleClick}
            className="pointer-events-auto flex flex-col items-center gap-1 border-2 border-cpc-cyan-500 bg-black/70 px-2 py-1 font-mono text-xs whitespace-nowrap text-cpc-cyan-500 transition-colors hover:bg-cpc-cyan-500 hover:text-cpc-grey-900"
          >
            <span aria-hidden="true">◎</span>
            <span>{marker.label}</span>
          </button>
        ) : (
          <div className="flex flex-col items-center border border-cpc-green-500 bg-black/60 px-2 py-0.5 font-mono text-xs whitespace-nowrap text-cpc-green-500">
            <span>{marker.label}</span>
            {marker.sublabel && <span className="text-cpc-yellow-500">{marker.sublabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Place every marker for the current frame.
 *
 * Distance sorting is what keeps a near label from hiding behind a far one: the
 * further a marker sits below the horizon the closer it is, so its elevation
 * doubles as a depth key.
 */
function positionMarkers(
  canvas: HTMLCanvasElement,
  markers: TourMarker[],
  elements: Map<string, HTMLElement>,
  camera: Camera,
) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width === 0 || height === 0) return;

  for (const marker of markers) {
    const element = elements.get(marker.id);
    if (!element) continue;

    const projected = projectToScreen(marker.azimuth, marker.elevation, camera, width, height);
    if (!projected.visible) {
      element.style.display = 'none';
      continue;
    }
    element.style.display = 'block';
    element.style.transform = `translate(${projected.x}px, ${projected.y}px)`;
    // Nearer markers sit lower in frame; letting them win keeps labels readable.
    element.style.zIndex = String(10 + Math.round(projected.y / 10));
  }
}

/** Two fingers: the change in their separation drives the field of view. */
function handlePinch(
  pointers: Map<number, { x: number; y: number }>,
  pinchDistanceRef: React.RefObject<number | null>,
  cameraRef: React.RefObject<Camera>,
) {
  const [first, second] = Array.from(pointers.values());
  if (!first || !second) return;

  const distance = Math.hypot(second.x - first.x, second.y - first.y);
  const previous = pinchDistanceRef.current;
  pinchDistanceRef.current = distance;
  if (previous == null || previous === 0) return;

  const camera = cameraRef.current;
  if (!camera) return;
  camera.fov = clamp(camera.fov * (previous / distance), MIN_FOV, MAX_FOV);
}
