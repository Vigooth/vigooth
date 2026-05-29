import { CellType, type Dungeon, type Room, cellAt, setCell } from '@/types/dungeon';
import { createRng } from '../rng';
import type { GenerateOptions } from './types';

export function generateRoomsDungeon(opts: GenerateOptions): Dungeon {
  const { width, height, seed } = opts;
  const roomAttempts = 80;
  const minRoomSize = 4;
  const maxRoomSize = 10;

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

  for (let attempt = 0; attempt < roomAttempts; attempt++) {
    const w = rng.int(minRoomSize, maxRoomSize);
    const h = rng.int(minRoomSize, maxRoomSize);
    const x = rng.int(1, width - w - 2);
    const y = rng.int(1, height - h - 2);

    if (overlapsAny(dungeon.rooms, x, y, w, h, 1)) continue;

    const room: Room = { id: dungeon.rooms.length, x, y, width: w, height: h };
    dungeon.rooms.push(room);
    carveRoom(dungeon, room);
  }

  for (let i = 1; i < dungeon.rooms.length; i++) {
    const a = roomCenter(dungeon.rooms[i - 1]);
    const b = roomCenter(dungeon.rooms[i]);
    carveCorridor(dungeon, a.x, a.y, b.x, b.y, rng.next() < 0.5);
  }

  placeDoors(dungeon);

  return dungeon;
}

function overlapsAny(
  rooms: Room[],
  x: number,
  y: number,
  w: number,
  h: number,
  padding: number,
): boolean {
  for (const r of rooms) {
    if (
      x - padding < r.x + r.width &&
      x + w + padding > r.x &&
      y - padding < r.y + r.height &&
      y + h + padding > r.y
    ) {
      return true;
    }
  }
  return false;
}

function carveRoom(d: Dungeon, room: Room): void {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      setCell(d, x, y, CellType.Floor);
    }
  }
}

function carveCorridor(
  d: Dungeon,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  horizontalFirst: boolean,
): void {
  if (horizontalFirst) {
    carveHorizontal(d, x1, x2, y1);
    carveVertical(d, y1, y2, x2);
  } else {
    carveVertical(d, y1, y2, x1);
    carveHorizontal(d, x1, x2, y2);
  }
}

function carveHorizontal(d: Dungeon, x1: number, x2: number, y: number): void {
  const start = Math.min(x1, x2);
  const end = Math.max(x1, x2);
  for (let x = start; x <= end; x++) {
    if (cellAt(d, x, y) === CellType.Wall) {
      setCell(d, x, y, CellType.Corridor);
    }
  }
}

function carveVertical(d: Dungeon, y1: number, y2: number, x: number): void {
  const start = Math.min(y1, y2);
  const end = Math.max(y1, y2);
  for (let y = start; y <= end; y++) {
    if (cellAt(d, x, y) === CellType.Wall) {
      setCell(d, x, y, CellType.Corridor);
    }
  }
}

function roomCenter(room: Room): { x: number; y: number } {
  return {
    x: Math.floor(room.x + room.width / 2),
    y: Math.floor(room.y + room.height / 2),
  };
}

function placeDoors(d: Dungeon): void {
  for (const room of d.rooms) {
    for (let x = room.x; x < room.x + room.width; x++) {
      tryDoor(d, x, room.y - 1);
      tryDoor(d, x, room.y + room.height);
    }
    for (let y = room.y; y < room.y + room.height; y++) {
      tryDoor(d, room.x - 1, y);
      tryDoor(d, room.x + room.width, y);
    }
  }
}

function tryDoor(d: Dungeon, x: number, y: number): void {
  if (cellAt(d, x, y) !== CellType.Corridor) return;
  setCell(d, x, y, CellType.Door);
}
