import type { Stamp } from '@/types/dungeon';

export type HandleKind =
  | 'rotate'
  | 'resize-nw'
  | 'resize-n'
  | 'resize-ne'
  | 'resize-e'
  | 'resize-se'
  | 'resize-s'
  | 'resize-sw'
  | 'resize-w';

export const HANDLE_SIZE = 10;
export const ROTATE_OFFSET = 28;
export const RESIZE_HANDLES: HandleKind[] = [
  'resize-nw',
  'resize-n',
  'resize-ne',
  'resize-e',
  'resize-se',
  'resize-s',
  'resize-sw',
  'resize-w',
];

interface LocalPoint {
  x: number;
  y: number;
}

export function getHandleLocalPosition(stamp: Stamp, kind: HandleKind): LocalPoint {
  const hw = stamp.width / 2;
  const hh = stamp.height / 2;
  switch (kind) {
    case 'rotate':
      return { x: 0, y: -hh - ROTATE_OFFSET };
    case 'resize-nw':
      return { x: -hw, y: -hh };
    case 'resize-n':
      return { x: 0, y: -hh };
    case 'resize-ne':
      return { x: hw, y: -hh };
    case 'resize-e':
      return { x: hw, y: 0 };
    case 'resize-se':
      return { x: hw, y: hh };
    case 'resize-s':
      return { x: 0, y: hh };
    case 'resize-sw':
      return { x: -hw, y: hh };
    case 'resize-w':
      return { x: -hw, y: 0 };
  }
}

export function getHandleWorldPosition(stamp: Stamp, kind: HandleKind): LocalPoint {
  const local = getHandleLocalPosition(stamp, kind);
  const cos = Math.cos(stamp.rotation);
  const sin = Math.sin(stamp.rotation);
  return {
    x: stamp.x + local.x * cos - local.y * sin,
    y: stamp.y + local.x * sin + local.y * cos,
  };
}

export function worldToStampLocal(stamp: Stamp, worldX: number, worldY: number): LocalPoint {
  const dx = worldX - stamp.x;
  const dy = worldY - stamp.y;
  const cos = Math.cos(-stamp.rotation);
  const sin = Math.sin(-stamp.rotation);
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}

const RESIZE_OPPOSITES: Record<string, HandleKind> = {
  'resize-nw': 'resize-se',
  'resize-n': 'resize-s',
  'resize-ne': 'resize-sw',
  'resize-e': 'resize-w',
  'resize-se': 'resize-nw',
  'resize-s': 'resize-n',
  'resize-sw': 'resize-ne',
  'resize-w': 'resize-e',
};

function oppositeOf(kind: HandleKind): HandleKind {
  return RESIZE_OPPOSITES[kind] ?? kind;
}

export function applyResize(
  original: Stamp,
  handleKind: HandleKind,
  cursorWorld: LocalPoint,
  preserveAspect = false,
): Pick<Stamp, 'x' | 'y' | 'width' | 'height'> {
  const opposite = oppositeOf(handleKind);
  const anchorLocal = getHandleLocalPosition(original, opposite);
  const cos = Math.cos(original.rotation);
  const sin = Math.sin(original.rotation);
  const anchorWorld = {
    x: original.x + anchorLocal.x * cos - anchorLocal.y * sin,
    y: original.y + anchorLocal.x * sin + anchorLocal.y * cos,
  };
  const dx = cursorWorld.x - anchorWorld.x;
  const dy = cursorWorld.y - anchorWorld.y;
  const cosM = Math.cos(-original.rotation);
  const sinM = Math.sin(-original.rotation);
  const localX = dx * cosM - dy * sinM;
  const localY = dx * sinM + dy * cosM;

  const affectsX = handleKind.includes('e') || handleKind.includes('w');
  const affectsY = handleKind.includes('n') || handleKind.includes('s');
  let newW = affectsX ? Math.max(4, Math.abs(localX)) : original.width;
  let newH = affectsY ? Math.max(4, Math.abs(localY)) : original.height;

  const isCorner = affectsX && affectsY;
  if (preserveAspect && isCorner) {
    const aspect = original.width / original.height;
    if (newW / aspect > newH) newH = newW / aspect;
    else newW = newH * aspect;
  }

  const offX = opposite.includes('w') ? newW / 2 : opposite.includes('e') ? -newW / 2 : 0;
  const offY = opposite.includes('n') ? newH / 2 : opposite.includes('s') ? -newH / 2 : 0;

  return {
    x: anchorWorld.x + offX * cos - offY * sin,
    y: anchorWorld.y + offX * sin + offY * cos,
    width: newW,
    height: newH,
  };
}

export function applyRotation(
  original: Stamp,
  startCursorWorld: LocalPoint,
  cursorWorld: LocalPoint,
  snap = false,
): number {
  const startAngle = Math.atan2(
    startCursorWorld.y - original.y,
    startCursorWorld.x - original.x,
  );
  const currentAngle = Math.atan2(cursorWorld.y - original.y, cursorWorld.x - original.x);
  let rot = original.rotation + (currentAngle - startAngle);
  if (snap) {
    const step = Math.PI / 12;
    rot = Math.round(rot / step) * step;
  }
  return rot;
}

export function hitTestHandle(stamp: Stamp, worldX: number, worldY: number): HandleKind | null {
  const local = worldToStampLocal(stamp, worldX, worldY);
  const half = HANDLE_SIZE / 2;
  const handles: HandleKind[] = ['rotate', ...RESIZE_HANDLES];
  for (const kind of handles) {
    const p = getHandleLocalPosition(stamp, kind);
    if (Math.abs(local.x - p.x) <= half && Math.abs(local.y - p.y) <= half) return kind;
  }
  return null;
}
