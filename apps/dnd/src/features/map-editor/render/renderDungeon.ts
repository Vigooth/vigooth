import { Container, Graphics } from 'pixi.js';
import { CellType, cellAt, type CellTypeValue, type Dungeon } from '@/types/dungeon';

export interface RenderOptions {
  tileSize: number;
  bg: number;
  floor: number;
  corridor: number;
  wallLine: number;
  door: number;
  water: number;
  lava: number;
  fire: number;
  grass: number;
  grassAccent: number;
  tallGrass: number;
  tallGrassBlade: number;
}

export const defaultRenderOptions: RenderOptions = {
  tileSize: 24,
  bg: 0xf5efe0,
  floor: 0xffffff,
  corridor: 0xd9d2bd,
  wallLine: 0x1a1a1a,
  door: 0x8b5a2b,
  water: 0x1e5a9e,
  lava: 0xc8331b,
  fire: 0xff7820,
  grass: 0x73a743,
  grassAccent: 0x52833a,
  tallGrass: 0x3f7a35,
  tallGrassBlade: 0x224a1c,
};

interface FillRule {
  type: CellTypeValue;
  color: number;
  includeDoors?: boolean;
}

export function renderDungeon(
  tilesContainer: Container,
  dungeon: Dungeon,
  options: RenderOptions = defaultRenderOptions,
): void {
  tilesContainer.removeChildren();
  const ts = options.tileSize;

  const bgLayer = new Graphics();
  bgLayer.rect(0, 0, dungeon.width * ts, dungeon.height * ts).fill(options.bg);
  tilesContainer.addChild(bgLayer);

  const fills: FillRule[] = [
    { type: CellType.Corridor, color: options.corridor },
    { type: CellType.Floor, color: options.floor, includeDoors: true },
    { type: CellType.Water, color: options.water },
    { type: CellType.Lava, color: options.lava },
    { type: CellType.Fire, color: options.fire },
    { type: CellType.Grass, color: options.grass },
    { type: CellType.TallGrass, color: options.tallGrass },
  ];

  for (const { type, color, includeDoors } of fills) {
    const g = new Graphics();
    let drew = false;
    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        const c = cellAt(dungeon, x, y);
        if (c === type || (includeDoors && c === CellType.Door)) {
          g.rect(x * ts, y * ts, ts, ts);
          drew = true;
        }
      }
    }
    if (drew) {
      g.fill(color);
      tilesContainer.addChild(g);
    }
  }

  tilesContainer.addChild(renderGrassPattern(dungeon, ts, options.grassAccent, CellType.Grass));
  tilesContainer.addChild(
    renderTallGrassPattern(dungeon, ts, options.tallGrassBlade, CellType.TallGrass),
  );

  const wallLayer = new Graphics();
  for (let y = 0; y < dungeon.height; y++) {
    for (let x = 0; x < dungeon.width; x++) {
      const c = cellAt(dungeon, x, y);
      if (c === CellType.Wall) continue;
      const px = x * ts;
      const py = y * ts;
      if (isWall(dungeon, x, y - 1)) wallLayer.moveTo(px, py).lineTo(px + ts, py);
      if (isWall(dungeon, x, y + 1)) wallLayer.moveTo(px, py + ts).lineTo(px + ts, py + ts);
      if (isWall(dungeon, x - 1, y)) wallLayer.moveTo(px, py).lineTo(px, py + ts);
      if (isWall(dungeon, x + 1, y)) wallLayer.moveTo(px + ts, py).lineTo(px + ts, py + ts);
    }
  }
  wallLayer.stroke({ width: 2, color: options.wallLine, alignment: 0.5 });
  tilesContainer.addChild(wallLayer);

  const doorLayer = new Graphics();
  for (let y = 0; y < dungeon.height; y++) {
    for (let x = 0; x < dungeon.width; x++) {
      if (cellAt(dungeon, x, y) !== CellType.Door) continue;
      const px = x * ts;
      const py = y * ts;
      const m = ts * 0.25;
      doorLayer.rect(px + m, py + m, ts - m * 2, ts - m * 2);
    }
  }
  doorLayer.fill(options.door).stroke({ width: 1, color: options.wallLine });
  tilesContainer.addChild(doorLayer);
}

function isWall(d: Dungeon, x: number, y: number): boolean {
  return cellAt(d, x, y) === CellType.Wall;
}

function renderGrassPattern(d: Dungeon, ts: number, accent: number, type: CellTypeValue): Graphics {
  const g = new Graphics();
  let drew = false;
  for (let y = 0; y < d.height; y++) {
    for (let x = 0; x < d.width; x++) {
      if (cellAt(d, x, y) !== type) continue;
      drew = true;
      const px = x * ts;
      const py = y * ts;
      const seed = hash2(x, y);
      // Random tufts of small darker dots
      for (let i = 0; i < 4; i++) {
        const rx = ((seed >> (i * 3)) & 0x7) / 8;
        const ry = ((seed >> (i * 3 + 12)) & 0x7) / 8;
        g.circle(px + ts * (0.1 + rx * 0.8), py + ts * (0.1 + ry * 0.8), ts * 0.04);
      }
    }
  }
  if (drew) g.fill({ color: accent, alpha: 0.65 });
  return g;
}

function renderTallGrassPattern(
  d: Dungeon,
  ts: number,
  blade: number,
  type: CellTypeValue,
): Graphics {
  const g = new Graphics();
  let drew = false;
  for (let y = 0; y < d.height; y++) {
    for (let x = 0; x < d.width; x++) {
      if (cellAt(d, x, y) !== type) continue;
      drew = true;
      const px = x * ts;
      const py = y * ts;
      const seed = hash2(x, y);
      // 5 vertical blades per tile
      for (let i = 0; i < 5; i++) {
        const rx = ((seed >> (i * 3)) & 0x7) / 8;
        const ry = ((seed >> (i * 3 + 9)) & 0x3) / 4;
        const bx = px + ts * (0.1 + rx * 0.8);
        const by = py + ts * (0.5 + ry * 0.4);
        g.moveTo(bx, by).lineTo(bx, by - ts * 0.3);
      }
    }
  }
  if (drew) g.stroke({ width: 1, color: blade, alpha: 0.75 });
  return g;
}

function hash2(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}
