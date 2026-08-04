import { CellType, type CellTypeValue, type Dungeon, type Room, cellAt, setCell } from '@/types/dungeon';
import { createRng, type Rng } from '../rng';
import type { GenerateOptions } from './types';

const ROOM_ATTEMPTS = 60;
const MIN_ROOM = 3;
const MAX_ROOM = 7;
const WINDING = 30;
const EXTRA_CONNECTOR_CHANCE = 0.04;

type Region = number;

interface Ctx {
  d: Dungeon;
  rng: Rng;
  regions: Int32Array;
  current: Region;
}

export function generateMazeDungeon(opts: GenerateOptions): Dungeon {
  const w = ensureOdd(opts.width);
  const h = ensureOdd(opts.height);
  const seed = opts.seed;
  const rng = createRng(seed);
  const d: Dungeon = {
    width: w,
    height: h,
    cells: Array.from({ length: w * h }, () => CellType.Wall),
    rooms: [],
    stamps: [],
    fog: Array.from({ length: w * h }, () => 0),
    seed,
  };
  const ctx: Ctx = { d, rng, regions: new Int32Array(w * h).fill(-1), current: -1 };

  placeRooms(ctx);
  growMazes(ctx);
  connectRegions(ctx);
  removeDeadEnds(ctx);

  return d;
}

function ensureOdd(n: number): number {
  return n % 2 === 0 ? n + 1 : n;
}

function placeRooms(ctx: Ctx): void {
  const { d, rng } = ctx;
  for (let i = 0; i < ROOM_ATTEMPTS; i++) {
    const sw = MIN_ROOM + rng.int(0, MAX_ROOM - MIN_ROOM);
    const sh = MIN_ROOM + rng.int(0, MAX_ROOM - MIN_ROOM);
    const w = sw * 2 + 1 > d.width - 2 ? sw : sw;
    const h = sh * 2 + 1 > d.height - 2 ? sh : sh;
    const x = rng.int(1, Math.floor((d.width - w - 1) / 2)) * 2 + 1;
    const y = rng.int(1, Math.floor((d.height - h - 1) / 2)) * 2 + 1;
    if (x + w >= d.width - 1 || y + h >= d.height - 1) continue;

    let overlaps = false;
    for (const r of d.rooms) {
      if (x < r.x + r.width && x + w > r.x && y < r.y + r.height && y + h > r.y) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    const room: Room = { id: d.rooms.length, x, y, width: w, height: h };
    d.rooms.push(room);
    ctx.current++;
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        setCellRegion(ctx, xx, yy, CellType.Floor);
      }
    }
  }
}

function growMazes(ctx: Ctx): void {
  for (let y = 1; y < ctx.d.height; y += 2) {
    for (let x = 1; x < ctx.d.width; x += 2) {
      if (cellAt(ctx.d, x, y) !== CellType.Wall) continue;
      growMaze(ctx, x, y);
    }
  }
}

function growMaze(ctx: Ctx, sx: number, sy: number): void {
  ctx.current++;
  const cells: [number, number][] = [];
  carve(ctx, sx, sy, CellType.Corridor);
  cells.push([sx, sy]);
  let lastDir: [number, number] | null = null;

  while (cells.length) {
    const cell = cells[cells.length - 1];
    const dirs: [number, number][] = [];
    for (const dir of DIRS) {
      if (canCarve(ctx.d, cell[0], cell[1], dir[0], dir[1])) dirs.push(dir);
    }

    if (dirs.length) {
      let dir: [number, number];
      if (lastDir && dirs.some((d) => d[0] === lastDir![0] && d[1] === lastDir![1]) && ctx.rng.int(0, 100) > WINDING) {
        dir = lastDir;
      } else {
        dir = ctx.rng.pick(dirs);
      }
      carve(ctx, cell[0] + dir[0], cell[1] + dir[1], CellType.Corridor);
      carve(ctx, cell[0] + dir[0] * 2, cell[1] + dir[1] * 2, CellType.Corridor);
      cells.push([cell[0] + dir[0] * 2, cell[1] + dir[1] * 2]);
      lastDir = dir;
    } else {
      cells.pop();
      lastDir = null;
    }
  }
}

const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function canCarve(d: Dungeon, x: number, y: number, dx: number, dy: number): boolean {
  const nx = x + dx * 3;
  const ny = y + dy * 3;
  if (nx < 0 || ny < 0 || nx >= d.width || ny >= d.height) return false;
  return cellAt(d, x + dx * 2, y + dy * 2) === CellType.Wall;
}

function carve(ctx: Ctx, x: number, y: number, t: CellTypeValue): void {
  setCellRegion(ctx, x, y, t);
}

function setCellRegion(ctx: Ctx, x: number, y: number, t: CellTypeValue): void {
  setCell(ctx.d, x, y, t);
  ctx.regions[y * ctx.d.width + x] = ctx.current;
}

function connectRegions(ctx: Ctx): void {
  const { d, regions, rng } = ctx;
  const connectorMap = new Map<number, Set<number>>();
  const connectors: number[] = [];

  for (let y = 1; y < d.height - 1; y++) {
    for (let x = 1; x < d.width - 1; x++) {
      if (cellAt(d, x, y) !== CellType.Wall) continue;
      const neighbors = new Set<number>();
      for (const [dx, dy] of DIRS) {
        const r = regions[(y + dy) * d.width + (x + dx)];
        if (r >= 0) neighbors.add(r);
      }
      if (neighbors.size < 2) continue;
      const idx = y * d.width + x;
      connectorMap.set(idx, neighbors);
      connectors.push(idx);
    }
  }

  const merged = new Int32Array(ctx.current + 1);
  for (let i = 0; i < merged.length; i++) merged[i] = i;
  const find = (a: number): number => (merged[a] === a ? a : (merged[a] = find(merged[a])));

  const openRegions = new Set<number>();
  for (let i = 0; i < merged.length; i++) openRegions.add(i);

  while (openRegions.size > 1 && connectors.length) {
    const pickIdx = rng.int(0, connectors.length - 1);
    const idx = connectors[pickIdx];
    const x = idx % d.width;
    const y = Math.floor(idx / d.width);
    const regs = Array.from(connectorMap.get(idx)!).map(find);
    const unique = Array.from(new Set(regs));

    if (unique.length < 2) {
      connectors.splice(pickIdx, 1);
      continue;
    }

    setCell(d, x, y, CellType.Door);
    const dest = unique[0];
    for (let i = 1; i < unique.length; i++) {
      merged[unique[i]] = dest;
      openRegions.delete(unique[i]);
    }

    // Remove this connector
    connectors.splice(pickIdx, 1);

    // Optionally add extra connectors for loops
    for (let i = connectors.length - 1; i >= 0; i--) {
      const cIdx = connectors[i];
      const cx = cIdx % d.width;
      const cy = Math.floor(cIdx / d.width);
      if (Math.abs(cx - x) + Math.abs(cy - y) < 2) {
        if (rng.next() < EXTRA_CONNECTOR_CHANCE) {
          setCell(d, cx, cy, CellType.Door);
        }
        connectors.splice(i, 1);
      }
    }
  }
}

function removeDeadEnds(ctx: Ctx): void {
  const { d } = ctx;
  let done = false;
  while (!done) {
    done = true;
    for (let y = 1; y < d.height - 1; y++) {
      for (let x = 1; x < d.width - 1; x++) {
        if (cellAt(d, x, y) === CellType.Wall) continue;
        let exits = 0;
        for (const [dx, dy] of DIRS) {
          if (cellAt(d, x + dx, y + dy) !== CellType.Wall) exits++;
        }
        if (exits === 1) {
          setCell(d, x, y, CellType.Wall);
          done = false;
        }
      }
    }
  }
}
