import { useEffect, useRef, useState } from 'react';
import {
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { loadCustomModel } from '@/lib/three/customModel';
import { useGarden } from '@/stores/GardenStore';

interface PlantModelPreviewProps {
  plantId: string;
  /** Bumps when the model is replaced, so the preview refetches. */
  version: string;
}

/** The model stands this tall in the preview; the camera is framed for it. */
const PREVIEW_HEIGHT = 1;
const TURN_SPEED = 0.5;

/**
 * A slowly turning view of a plant's uploaded model, in the photo's slot.
 *
 * Lazy-loaded by the card: three.js is a third of the bundle and most gardens
 * have no uploaded model at all. One renderer per card is fine at the scale of
 * a plant list; a garden with dozens of modelled plants would want a shared
 * renderer, and can have one the day it exists.
 */
export function PlantModelPreview({ plantId, version }: PlantModelPreviewProps) {
  const { modelUrlFor } = useGarden();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let animation = 0;
    let renderer: WebGLRenderer | null = null;
    setStatus('loading');

    const scene = new Scene();
    scene.background = new Color(0x000000);
    scene.add(new HemisphereLight(0xffffff, 0x3d5a2a, 1.1));
    const sun = new DirectionalLight(0xfff2d8, 1.4);
    sun.position.set(2, 3, 2);
    scene.add(sun);

    const camera = new PerspectiveCamera(35, 1, 0.05, 50);
    camera.position.set(0, PREVIEW_HEIGHT * 0.65, PREVIEW_HEIGHT * 2.6);
    camera.lookAt(0, PREVIEW_HEIGHT * 0.45, 0);

    const pivot = new Group();
    scene.add(pivot);

    const start = async () => {
      let url: string | null = null;
      try {
        url = await modelUrlFor(plantId);
        const model = await loadCustomModel(url);
        if (cancelled) return;
        if (!model) {
          setStatus('failed');
          return;
        }
        pivot.add(model.instantiate(PREVIEW_HEIGHT));

        renderer = new WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        const resize = () => {
          const { clientWidth, clientHeight } = canvas;
          if (clientWidth === 0 || clientHeight === 0 || !renderer) return;
          renderer.setSize(clientWidth, clientHeight, false);
          camera.aspect = clientWidth / clientHeight;
          camera.updateProjectionMatrix();
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);

        let previous = performance.now();
        const step = (now: number) => {
          animation = requestAnimationFrame(step);
          pivot.rotation.y += ((now - previous) / 1000) * TURN_SPEED;
          previous = now;
          renderer?.render(scene, camera);
        };
        animation = requestAnimationFrame(step);
        setStatus('ready');

        return () => observer.disconnect();
      } catch {
        if (!cancelled) setStatus('failed');
      } finally {
        if (url) URL.revokeObjectURL(url);
      }
    };

    const stopObserving = start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animation);
      void stopObserving.then((stop) => stop?.());
      renderer?.dispose();
    };
  }, [plantId, version, modelUrlFor]);

  return (
    <div className="relative h-52 w-full border border-cpc-green-900 bg-black">
      <canvas ref={canvasRef} className="block h-full w-full" hidden={status !== 'ready'} />
      {status !== 'ready' && (
        <div className="grid h-full w-full place-items-center text-xs text-cpc-green-900">
          {status === 'loading' ? 'CHARGEMENT DU MODELE 3D...' : 'MODELE 3D ILLISIBLE'}
        </div>
      )}
    </div>
  );
}
