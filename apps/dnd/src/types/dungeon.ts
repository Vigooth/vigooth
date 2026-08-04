export const CellType = {
  Wall: 0,
  Floor: 1,
  Door: 2,
  Corridor: 3,
  Water: 4,
  Lava: 5,
  Fire: 6,
  Grass: 7,
  TallGrass: 8,
} as const;

export type CellTypeValue = (typeof CellType)[keyof typeof CellType];

export interface Room {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type StampLayer = 'token' | 'decor';

export interface Stamp {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  layer: StampLayer;
}

export interface Dungeon {
  width: number;
  height: number;
  cells: CellTypeValue[];
  /** 0 = revealed, 1 = fogged. Same indexing as cells. */
  fog: number[];
  rooms: Room[];
  stamps: Stamp[];
  seed: number;
}

export function fogAt(d: Dungeon, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= d.width || y >= d.height) return 0;
  return d.fog[y * d.width + x] ?? 0;
}

export function setFog(d: Dungeon, x: number, y: number, value: 0 | 1): void {
  if (x < 0 || y < 0 || x >= d.width || y >= d.height) return;
  d.fog[y * d.width + x] = value;
}

export function fillFog(d: Dungeon, value: 0 | 1): void {
  for (let i = 0; i < d.fog.length; i++) d.fog[i] = value;
}

export function cellAt(d: Dungeon, x: number, y: number): CellTypeValue {
  if (x < 0 || y < 0 || x >= d.width || y >= d.height) return CellType.Wall;
  return d.cells[y * d.width + x];
}

export function setCell(d: Dungeon, x: number, y: number, value: CellTypeValue): void {
  if (x < 0 || y < 0 || x >= d.width || y >= d.height) return;
  d.cells[y * d.width + x] = value;
}

/**
 * Shallow-detach a Dungeon: produces a new object whose `cells` and `stamps`
 * arrays are independent from the source. Stamp `src` strings are shared
 * (data URLs can be heavy). Rooms are shared (immutable during edits).
 */
export function cloneDungeon(d: Dungeon): Dungeon {
  return {
    ...d,
    cells: d.cells.slice(),
    fog: d.fog.slice(),
    stamps: d.stamps.map((s) => ({ ...s })),
    rooms: d.rooms,
  };
}
