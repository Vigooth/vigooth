import { useEffect, useRef } from 'react';
import {
  BufferGeometry,
  Color,
  DirectionalLight,
  Fog,
  Float32BufferAttribute,
  HemisphereLight,
  LineBasicMaterial,
  LineLoop,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { PlanFrame } from '../utils/layout';
import type { GardenModel } from '../utils/buildGarden';
import { disposeGarden } from '../utils/buildGarden';

export type WalkMode = 'orbit' | 'walk';

export interface WalkApi {
  /** Move the camera to look at a bed: orbit around it, or stand in front of it. */
  goTo: (bedId: string) => void;
  /** Hold or release a walking direction, for the on-screen pad. */
  setMove: (direction: MoveDirection, pressed: boolean) => void;
}

export type MoveDirection = 'forward' | 'back' | 'left' | 'right';

interface WalkCanvasProps {
  model: GardenModel | null;
  frame: PlanFrame;
  mode: WalkMode;
  selectedBedId: string | null;
  onSelectBed: (bedId: string | null) => void;
  onReady?: (api: WalkApi) => void;
}

const SKY = 0xbfe3f5;
const EYE_HEIGHT = 1.6;
const WALK_SPEED = 3;
const LOOK_SPEED = 0.005;
/** Looking straight up or down flips the horizon, so pitch stops a little short. */
const MAX_PITCH = Math.PI / 2 - 0.15;
/** A drag shorter than this is a tap: it selects rather than turns. */
const TAP_SLOP_PX = 6;
const HIGHLIGHT = 0xffff00;

interface WalkerState {
  position: Vector3;
  yaw: number;
  pitch: number;
  moving: Set<MoveDirection>;
}

/** Yaw that turns the camera at `from` towards `to`, in the YXZ convention used here. */
function yawTowards(from: Vector3, to: Vector3): number {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}

/**
 * The 3D garden and its two ways of getting around.
 *
 * Orbit is the model-on-a-table view three.js gives for free. Walk is a small
 * first-person controller: drag to look, keys or the pad to move, feet kept on
 * the ground and inside the lawn. The camera lives in refs, not state, for the
 * same reason as the 360° tour's: it changes every frame, and React must not
 * re-render every label sixty times a second. The frame loop writes the canvas
 * and then positions each label element directly.
 */
export function WalkCanvas({
  model,
  frame,
  mode,
  selectedBedId,
  onSelectBed,
  onReady,
}: WalkCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const orbitRef = useRef<OrbitControls | null>(null);
  const sunRef = useRef<DirectionalLight | null>(null);
  const modelRef = useRef<GardenModel | null>(null);
  const highlightRef = useRef<LineLoop | null>(null);
  const labelElements = useRef(new Map<string, HTMLElement>());

  const walker = useRef<WalkerState>({
    position: new Vector3(0, EYE_HEIGHT, frame.depthM / 2 + 3),
    yaw: 0,
    pitch: -0.1,
    moving: new Set(),
  });

  // Read inside handlers that must not be re-bound on every render.
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const onSelectRef = useRef(onSelectBed);
  onSelectRef.current = onSelectBed;

  // Renderer, scene, lights and the frame loop: built once per mount.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = new WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;

    const scene = new Scene();
    scene.background = new Color(SKY);
    scene.fog = new Fog(SKY, 40, 160);
    sceneRef.current = scene;

    const camera = new PerspectiveCamera(60, 1, 0.1, 300);
    camera.rotation.order = 'YXZ';
    cameraRef.current = camera;

    scene.add(new HemisphereLight(0xd8f0ff, 0x3d5a2a, 0.9));
    const sun = new DirectionalLight(0xfff2d8, 1.7);
    sun.position.set(18, 30, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const reach = Math.max(frameRef.current.widthM, frameRef.current.depthM) * 0.75 + 4;
    sun.shadow.camera.left = -reach;
    sun.shadow.camera.right = reach;
    sun.shadow.camera.top = reach;
    sun.shadow.camera.bottom = -reach;
    sun.shadow.camera.far = 100;
    sun.shadow.bias = -0.0005;
    scene.add(sun);
    sunRef.current = sun;

    const orbit = new OrbitControls(camera, canvas);
    orbit.enableDamping = true;
    orbit.maxPolarAngle = Math.PI / 2 - 0.05;
    orbit.minDistance = 2;
    orbit.maxDistance = 120;
    orbitRef.current = orbit;

    // Start above the south edge, looking over the whole plot.
    const span = Math.max(frameRef.current.widthM, frameRef.current.depthM);
    camera.position.set(0, span * 0.7, frameRef.current.depthM / 2 + span * 0.6);
    orbit.target.set(0, 0, 0);
    orbit.update();

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      if (clientWidth === 0 || clientHeight === 0) return;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    // --- Walk-mode input -------------------------------------------------
    const pressed = walker.current.moving;
    const keyDirection = (code: string): MoveDirection | null => {
      switch (code) {
        case 'KeyW':
        case 'ArrowUp':
          return 'forward';
        case 'KeyS':
        case 'ArrowDown':
          return 'back';
        case 'KeyA':
        case 'ArrowLeft':
          return 'left';
        case 'KeyD':
        case 'ArrowRight':
          return 'right';
        default:
          return null;
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (modeRef.current !== 'walk') return;
      const direction = keyDirection(event.code);
      if (!direction) return;
      event.preventDefault();
      pressed.add(direction);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const direction = keyDirection(event.code);
      if (direction) pressed.delete(direction);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const raycaster = new Raycaster();
    const pick = (clientX: number, clientY: number) => {
      const current = modelRef.current;
      if (!current) return;
      const bounds = canvas.getBoundingClientRect();
      const ndc = new Vector2(
        ((clientX - bounds.left) / bounds.width) * 2 - 1,
        -((clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects([...current.pickables.keys()], false);
      const hit = hits.find((candidate) => current.pickables.has(candidate.object));
      onSelectRef.current(hit ? (current.pickables.get(hit.object) ?? null) : null);
    };

    // Pointer handling serves both modes: a tap picks a bed in either, and a
    // drag turns the head in walk mode (OrbitControls handles drags in orbit).
    let pointerStart: { x: number; y: number; id: number } | null = null;
    let lastPointer: { x: number; y: number } | null = null;
    let dragged = false;

    const handlePointerDown = (event: PointerEvent) => {
      if (pointerStart) return;
      pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
      lastPointer = { x: event.clientX, y: event.clientY };
      dragged = false;
      canvas.setPointerCapture(event.pointerId);
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerStart || !lastPointer || event.pointerId !== pointerStart.id) return;
      if (
        Math.abs(event.clientX - pointerStart.x) > TAP_SLOP_PX ||
        Math.abs(event.clientY - pointerStart.y) > TAP_SLOP_PX
      ) {
        dragged = true;
      }
      if (modeRef.current === 'walk') {
        const state = walker.current;
        state.yaw -= (event.clientX - lastPointer.x) * LOOK_SPEED;
        state.pitch = Math.max(
          -MAX_PITCH,
          Math.min(MAX_PITCH, state.pitch - (event.clientY - lastPointer.y) * LOOK_SPEED),
        );
      }
      lastPointer = { x: event.clientX, y: event.clientY };
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (!pointerStart || event.pointerId !== pointerStart.id) return;
      if (!dragged) pick(event.clientX, event.clientY);
      pointerStart = null;
      lastPointer = null;
    };
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);

    // --- Frame loop ---------------------------------------------------------
    const forward = new Vector3();
    const right = new Vector3();
    const projected = new Vector3();
    let previous = performance.now();
    let animation = 0;

    const step = (now: number) => {
      animation = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;

      if (modeRef.current === 'walk') {
        const state = walker.current;
        forward.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
        right.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
        const distance = WALK_SPEED * dt;
        if (state.moving.has('forward')) state.position.addScaledVector(forward, distance);
        if (state.moving.has('back')) state.position.addScaledVector(forward, -distance);
        if (state.moving.has('left')) state.position.addScaledVector(right, -distance);
        if (state.moving.has('right')) state.position.addScaledVector(right, distance);

        // Stay on the lawn: the plot plus the padding the ground extends over.
        const limitX = frameRef.current.widthM / 2 + 2.5;
        const limitZ = frameRef.current.depthM / 2 + 2.5;
        state.position.x = Math.max(-limitX, Math.min(limitX, state.position.x));
        state.position.z = Math.max(-limitZ, Math.min(limitZ, state.position.z));
        state.position.y = EYE_HEIGHT;

        camera.position.copy(state.position);
        camera.rotation.set(state.pitch, state.yaw, 0);
      } else {
        orbit.update();
      }

      renderer.render(scene, camera);

      // Labels: project each anchor and move its element. Behind the camera or
      // far outside the frame, the element is hidden rather than left to drift.
      const current = modelRef.current;
      if (current) {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        for (const anchor of current.anchors) {
          const element = labelElements.current.get(anchor.bedId);
          if (!element) continue;
          projected.copy(anchor.position).project(camera);
          const visible =
            projected.z < 1 && Math.abs(projected.x) < 1.2 && Math.abs(projected.y) < 1.2;
          element.hidden = !visible;
          if (!visible) continue;
          const x = ((projected.x + 1) / 2) * width;
          const y = ((1 - projected.y) / 2) * height;
          element.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        }
      }
    };
    animation = requestAnimationFrame(step);

    onReady?.({
      goTo: (bedId) => {
        const centre = modelRef.current?.centres.get(bedId);
        if (!centre) return;
        if (modeRef.current === 'walk') {
          const state = walker.current;
          // Stand a couple of metres south of the bed, facing it.
          state.position.set(centre.x, EYE_HEIGHT, centre.z + 3);
          state.yaw = yawTowards(state.position, centre);
          state.pitch = -0.25;
        } else {
          const offset = camera.position.clone().sub(orbit.target).setLength(7);
          orbit.target.copy(centre);
          camera.position.copy(centre).add(offset);
          orbit.update();
        }
      },
      setMove: (direction, isPressed) => {
        if (isPressed) pressed.add(direction);
        else pressed.delete(direction);
      },
    });

    return () => {
      cancelAnimationFrame(animation);
      observer.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      orbit.dispose();
      renderer.dispose();
      sceneRef.current = null;
      cameraRef.current = null;
      orbitRef.current = null;
    };
    // The loop reads everything else through refs; only a remount rebuilds it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap the garden model in and out of the scene.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const previous = modelRef.current;
    if (previous) {
      scene.remove(previous.group);
      disposeGarden(previous);
    }
    modelRef.current = model;
    if (model) scene.add(model.group);
  }, [model]);

  // Switching to walk mode plants the feet where the orbit camera was looking
  // from, so the visitor does not lose their place.
  useEffect(() => {
    const camera = cameraRef.current;
    const orbit = orbitRef.current;
    if (!camera || !orbit) return;
    orbit.enabled = mode === 'orbit';
    if (mode === 'walk') {
      const state = walker.current;
      const limitX = frame.widthM / 2 + 2.5;
      const limitZ = frame.depthM / 2 + 2.5;
      state.position.set(
        Math.max(-limitX, Math.min(limitX, camera.position.x)),
        EYE_HEIGHT,
        Math.max(-limitZ, Math.min(limitZ, camera.position.z)),
      );
      state.yaw = yawTowards(state.position, orbit.target);
      state.pitch = -0.1;
    } else {
      // Back to orbit: look at the middle of the plot from the walker's side.
      orbit.target.set(0, 0, 0);
      const span = Math.max(frame.widthM, frame.depthM);
      const fromWalker = camera.position.clone().setY(0);
      if (fromWalker.lengthSq() < 1) fromWalker.set(0, 0, 1);
      fromWalker.setLength(span * 0.9);
      camera.position.set(fromWalker.x, span * 0.7, fromWalker.z);
      orbit.update();
    }
  }, [mode, frame]);

  // A wider garden needs a wider shadow map, or the far beds lose their shadows.
  useEffect(() => {
    const sun = sunRef.current;
    if (!sun) return;
    const reach = Math.max(frame.widthM, frame.depthM) * 0.75 + 4;
    sun.shadow.camera.left = -reach;
    sun.shadow.camera.right = reach;
    sun.shadow.camera.top = reach;
    sun.shadow.camera.bottom = -reach;
    sun.shadow.camera.updateProjectionMatrix();
  }, [frame]);

  // A yellow outline on the ground around the selected bed.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (highlightRef.current) {
      scene.remove(highlightRef.current);
      highlightRef.current.geometry.dispose();
      highlightRef.current = null;
    }
    const ring = selectedBedId ? model?.rings.get(selectedBedId) : undefined;
    if (!ring) return;

    const positions: number[] = [];
    for (const [x, z] of ring) positions.push(x, 0.03, z);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const loop = new LineLoop(geometry, new LineBasicMaterial({ color: HIGHLIGHT }));
    // Lift the outline to the top of a raised bed so it is not hidden inside it.
    const centre = model?.centres.get(selectedBedId ?? '');
    if (centre) loop.position.y = centre.y + 0.02;
    scene.add(loop);
    highlightRef.current = loop;
  }, [selectedBedId, model]);

  const registerLabel = (bedId: string) => (element: HTMLElement | null) => {
    if (element) labelElements.current.set(bedId, element);
    else labelElements.current.delete(bedId);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[70vh] min-h-[360px] w-full touch-none overflow-hidden border-2 border-cpc-green-900 bg-black"
    >
      <canvas ref={canvasRef} className="block h-full w-full cursor-grab active:cursor-grabbing" />

      <div className="pointer-events-none absolute inset-0">
        {model?.anchors.map((anchor) => (
          <div
            key={anchor.bedId}
            ref={registerLabel(anchor.bedId)}
            hidden
            className={`absolute top-0 left-0 max-w-[12rem] border px-2 py-1 text-center font-mono text-[10px] leading-tight whitespace-nowrap ${
              anchor.bedId === selectedBedId
                ? 'border-cpc-yellow-500 bg-black/85 text-cpc-yellow-500'
                : 'border-cpc-green-900 bg-black/70 text-cpc-green-500'
            }`}
          >
            <div className="truncate">{anchor.name}</div>
            {anchor.planted && <div className="truncate text-cpc-green-900">{anchor.planted}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
