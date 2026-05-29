import { CellType, type Dungeon, type Room, cellAt, setCell } from '@/types/dungeon';
import { createRng, type Rng } from '../rng';
import type { GenerateOptions } from './types';

interface Node {
  x: number;
  y: number;
  w: number;
  h: number;
  left?: Node;
  right?: Node;
  room?: Room;
}

const MIN_LEAF = 8;
const MAX_LEAF = 18;

export function generateBspDungeon(opts: GenerateOptions): Dungeon {
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

  const root: Node = { x: 1, y: 1, w: width - 2, h: height - 2 };
  splitNode(root, rng, 0);
  createRooms(root, rng, dungeon);
  connectNodes(root, rng, dungeon);
  placeDoors(dungeon);

  return dungeon;
}

function splitNode(node: Node, rng: Rng, depth: number): void {
  if (depth > 5) return;
  if (node.w < MIN_LEAF * 2 && node.h < MIN_LEAF * 2) return;

  const horizontalAllowed = node.h >= MIN_LEAF * 2;
  const verticalAllowed = node.w >= MIN_LEAF * 2;

  let splitHorizontal: boolean;
  if (horizontalAllowed && verticalAllowed) {
    if (node.w > node.h * 1.25) splitHorizontal = false;
    else if (node.h > node.w * 1.25) splitHorizontal = true;
    else splitHorizontal = rng.next() < 0.5;
  } else {
    splitHorizontal = horizontalAllowed;
  }

  if (splitHorizontal) {
    const split = rng.int(MIN_LEAF, node.h - MIN_LEAF);
    node.left = { x: node.x, y: node.y, w: node.w, h: split };
    node.right = { x: node.x, y: node.y + split, w: node.w, h: node.h - split };
  } else {
    const split = rng.int(MIN_LEAF, node.w - MIN_LEAF);
    node.left = { x: node.x, y: node.y, w: split, h: node.h };
    node.right = { x: node.x + split, y: node.y, w: node.w - split, h: node.h };
  }

  splitNode(node.left, rng, depth + 1);
  splitNode(node.right, rng, depth + 1);
}

function createRooms(node: Node, rng: Rng, dungeon: Dungeon): void {
  if (node.left || node.right) {
    if (node.left) createRooms(node.left, rng, dungeon);
    if (node.right) createRooms(node.right, rng, dungeon);
    return;
  }
  const maxW = Math.min(node.w - 2, MAX_LEAF);
  const maxH = Math.min(node.h - 2, MAX_LEAF);
  const w = rng.int(Math.min(4, maxW), maxW);
  const h = rng.int(Math.min(4, maxH), maxH);
  const x = node.x + rng.int(1, node.w - w - 1);
  const y = node.y + rng.int(1, node.h - h - 1);
  const room: Room = { id: dungeon.rooms.length, x, y, width: w, height: h };
  dungeon.rooms.push(room);
  node.room = room;
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      setCell(dungeon, xx, yy, CellType.Floor);
    }
  }
}

function connectNodes(node: Node, rng: Rng, dungeon: Dungeon): Room | undefined {
  if (node.room) return node.room;
  const left = node.left ? connectNodes(node.left, rng, dungeon) : undefined;
  const right = node.right ? connectNodes(node.right, rng, dungeon) : undefined;
  if (left && right) {
    carveLink(dungeon, roomCenter(left), roomCenter(right), rng.next() < 0.5);
  }
  return left ?? right;
}

function carveLink(
  d: Dungeon,
  a: { x: number; y: number },
  b: { x: number; y: number },
  horizontalFirst: boolean,
): void {
  if (horizontalFirst) {
    carveH(d, a.x, b.x, a.y);
    carveV(d, a.y, b.y, b.x);
  } else {
    carveV(d, a.y, b.y, a.x);
    carveH(d, a.x, b.x, b.y);
  }
}

function carveH(d: Dungeon, x1: number, x2: number, y: number): void {
  const s = Math.min(x1, x2);
  const e = Math.max(x1, x2);
  for (let x = s; x <= e; x++) {
    if (cellAt(d, x, y) === CellType.Wall) setCell(d, x, y, CellType.Corridor);
  }
}

function carveV(d: Dungeon, y1: number, y2: number, x: number): void {
  const s = Math.min(y1, y2);
  const e = Math.max(y1, y2);
  for (let y = s; y <= e; y++) {
    if (cellAt(d, x, y) === CellType.Wall) setCell(d, x, y, CellType.Corridor);
  }
}

function roomCenter(r: Room): { x: number; y: number } {
  return { x: Math.floor(r.x + r.width / 2), y: Math.floor(r.y + r.height / 2) };
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
