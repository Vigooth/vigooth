import { CellType, type Dungeon, cellAt, setCell } from '@/types/dungeon';
import { createRng } from '../rng';
import type { GenerateOptions } from './types';

const FILL_PROBABILITY = 0.45;
const ITERATIONS = 5;
const BIRTH_LIMIT = 4;
const SURVIVE_LIMIT = 3;

export function generateCellularDungeon(opts: GenerateOptions): Dungeon {
  const { width, height, seed } = opts;
  const rng = createRng(seed);
  const dungeon: Dungeon = {
    width,
    height,
    cells: Array.from({ length: width * height }, () => CellType.Wall),
    rooms: [],
    stamps: [],
    fog: Array.from({ length: width * height }, () => 0),
    seed,
  };

  // Random fill
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      if (!isEdge && rng.next() > FILL_PROBABILITY) {
        setCell(dungeon, x, y, CellType.Floor);
      }
    }
  }

  // Smoothing iterations
  for (let i = 0; i < ITERATIONS; i++) {
    step(dungeon);
  }

  // Keep largest connected region
  keepLargestRegion(dungeon);

  return dungeon;
}

function step(d: Dungeon): void {
  const next = d.cells.slice();
  for (let y = 1; y < d.height - 1; y++) {
    for (let x = 1; x < d.width - 1; x++) {
      const n = countWallNeighbors(d, x, y);
      const isWall = cellAt(d, x, y) === CellType.Wall;
      if (isWall) {
        next[y * d.width + x] = n >= SURVIVE_LIMIT ? CellType.Wall : CellType.Floor;
      } else {
        next[y * d.width + x] = n > BIRTH_LIMIT ? CellType.Wall : CellType.Floor;
      }
    }
  }
  d.cells = next;
}

function countWallNeighbors(d: Dungeon, cx: number, cy: number): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (cellAt(d, cx + dx, cy + dy) === CellType.Wall) count++;
    }
  }
  return count;
}

function keepLargestRegion(d: Dungeon): void {
  const visited = new Uint8Array(d.width * d.height);
  let largest: number[] = [];

  for (let y = 0; y < d.height; y++) {
    for (let x = 0; x < d.width; x++) {
      const idx = y * d.width + x;
      if (visited[idx] || cellAt(d, x, y) === CellType.Wall) continue;
      const region = floodFill(d, x, y, visited);
      if (region.length > largest.length) largest = region;
    }
  }

  const keep = new Set(largest);
  for (let i = 0; i < d.cells.length; i++) {
    if (d.cells[i] !== CellType.Wall && !keep.has(i)) {
      d.cells[i] = CellType.Wall;
    }
  }
}

function floodFill(d: Dungeon, startX: number, startY: number, visited: Uint8Array): number[] {
  const stack: [number, number][] = [[startX, startY]];
  const region: number[] = [];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    const idx = y * d.width + x;
    if (visited[idx]) continue;
    visited[idx] = 1;
    if (cellAt(d, x, y) === CellType.Wall) continue;
    region.push(idx);
    if (x > 0) stack.push([x - 1, y]);
    if (x < d.width - 1) stack.push([x + 1, y]);
    if (y > 0) stack.push([x, y - 1]);
    if (y < d.height - 1) stack.push([x, y + 1]);
  }
  return region;
}
