import { useEffect, useRef } from 'react';
import { Application, Container } from 'pixi.js';

function isTextInput(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}

export interface WorldPointerEvent {
  worldX: number;
  worldY: number;
  clientX: number;
  clientY: number;
  phase: 'down' | 'move' | 'up';
  buttons: number;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

export interface ContextMenuEvent {
  worldX: number;
  worldY: number;
  clientX: number;
  clientY: number;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface CanvasApi {
  setViewport: (vp: Viewport) => void;
  getViewport: () => Viewport;
}

interface PixiCanvasProps {
  onReady: (world: Container, app: Application, api: CanvasApi) => void;
  onWorldPointer?: (event: WorldPointerEvent) => void;
  onContextMenu?: (event: ContextMenuEvent) => boolean;
  className?: string;
}

export function PixiCanvas({ onReady, onWorldPointer, onContextMenu, className }: PixiCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const onPointerRef = useRef(onWorldPointer);
  const onContextMenuRef = useRef(onContextMenu);
  onReadyRef.current = onReady;
  onPointerRef.current = onWorldPointer;
  onContextMenuRef.current = onContextMenu;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let app: Application | null = null;
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let cleanupListeners: (() => void) | null = null;

    const viewport = { x: 0, y: 0, scale: 1 };
    let panning = false;
    let painting = false;
    let spaceHeld = false;
    let lastX = 0;
    let lastY = 0;

    const screenToWorld = (clientX: number, clientY: number) => {
      const rect = host.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return {
        x: (sx - viewport.x) / viewport.scale,
        y: (sy - viewport.y) / viewport.scale,
      };
    };

    const makePointerEvent = (
      e: PointerEvent,
      phase: WorldPointerEvent['phase'],
    ): WorldPointerEvent => {
      const w = screenToWorld(e.clientX, e.clientY);
      return {
        worldX: w.x,
        worldY: w.y,
        clientX: e.clientX,
        clientY: e.clientY,
        phase,
        buttons: e.buttons,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
      };
    };

    (async () => {
      const newApp = new Application();
      await newApp.init({
        resizeTo: host,
        background: 0x0a0a0a,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });

      if (cancelled) {
        newApp.destroy(true, { children: true });
        return;
      }

      app = newApp;
      const world = new Container();
      app.stage.addChild(world);
      host.appendChild(app.canvas);

      const applyTransform = () => {
        world.position.set(viewport.x, viewport.y);
        world.scale.set(viewport.scale);
      };

      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        // Cmd/Ctrl + wheel = zoom (Ctrl also catches native trackpad pinch on Mac).
        // Wheel alone = pan, taking both deltaX (trackpad) and deltaY axes.
        if (e.ctrlKey || e.metaKey) {
          const rect = host.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const factor = Math.exp(-e.deltaY * 0.01);
          const newScale = Math.max(0.1, Math.min(8, viewport.scale * factor));
          const ratio = newScale / viewport.scale;
          viewport.x = mx - (mx - viewport.x) * ratio;
          viewport.y = my - (my - viewport.y) * ratio;
          viewport.scale = newScale;
        } else {
          // Shift+wheel on a vertical-only mouse → translate horizontally instead.
          const dx = e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX;
          const dy = e.shiftKey && e.deltaX === 0 ? 0 : e.deltaY;
          viewport.x -= dx;
          viewport.y -= dy;
        }
        applyTransform();
      };

      const onPointerDown = (e: PointerEvent) => {
        if (e.button === 2) return; // right-click handled via contextmenu event
        host.setPointerCapture(e.pointerId);
        if (e.button === 1 || (e.button === 0 && spaceHeld)) {
          panning = true;
          lastX = e.clientX;
          lastY = e.clientY;
        } else if (e.button === 0) {
          painting = true;
          onPointerRef.current?.(makePointerEvent(e, 'down'));
        }
      };

      const onPointerMove = (e: PointerEvent) => {
        if (panning) {
          viewport.x += e.clientX - lastX;
          viewport.y += e.clientY - lastY;
          lastX = e.clientX;
          lastY = e.clientY;
          applyTransform();
        } else if (painting) {
          onPointerRef.current?.(makePointerEvent(e, 'move'));
        }
      };

      const onPointerUp = (e: PointerEvent) => {
        if (painting) {
          onPointerRef.current?.(makePointerEvent(e, 'up'));
        }
        panning = false;
        painting = false;
        if (host.hasPointerCapture(e.pointerId)) {
          host.releasePointerCapture(e.pointerId);
        }
      };

      const onContextEvt = (e: MouseEvent) => {
        e.preventDefault();
        const w = screenToWorld(e.clientX, e.clientY);
        onContextMenuRef.current?.({
          worldX: w.x,
          worldY: w.y,
          clientX: e.clientX,
          clientY: e.clientY,
        });
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.code !== 'Space' || isTextInput(e.target)) return;
        if (spaceHeld) return;
        spaceHeld = true;
        host.style.cursor = 'grab';
        e.preventDefault();
      };
      const onKeyUp = (e: KeyboardEvent) => {
        if (e.code !== 'Space') return;
        spaceHeld = false;
        host.style.cursor = '';
      };

      host.addEventListener('wheel', onWheel, { passive: false });
      host.addEventListener('pointerdown', onPointerDown);
      host.addEventListener('pointermove', onPointerMove);
      host.addEventListener('pointerup', onPointerUp);
      host.addEventListener('pointercancel', onPointerUp);
      host.addEventListener('contextmenu', onContextEvt);
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      observer = new ResizeObserver(() => {
        if (app) app.renderer.resize(host.clientWidth, host.clientHeight);
      });
      observer.observe(host);

      cleanupListeners = () => {
        host.removeEventListener('wheel', onWheel);
        host.removeEventListener('pointerdown', onPointerDown);
        host.removeEventListener('pointermove', onPointerMove);
        host.removeEventListener('pointerup', onPointerUp);
        host.removeEventListener('pointercancel', onPointerUp);
        host.removeEventListener('contextmenu', onContextEvt);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      };

      app.renderer.resize(host.clientWidth, host.clientHeight);

      const api: CanvasApi = {
        getViewport: () => ({ ...viewport }),
        setViewport: (vp) => {
          viewport.x = vp.x;
          viewport.y = vp.y;
          viewport.scale = vp.scale;
          applyTransform();
        },
      };
      onReadyRef.current(world, app, api);
    })();

    return () => {
      cancelled = true;
      cleanupListeners?.();
      observer?.disconnect();
      if (app) {
        const canvas = app.canvas;
        if (canvas && canvas.parentNode === host) host.removeChild(canvas);
        app.destroy(true, { children: true });
      }
    };
  }, []);

  return <div ref={hostRef} className={className} />;
}
