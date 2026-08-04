import { Graphics } from 'pixi.js';
import { CellType, cellAt, type Dungeon } from '@/types/dungeon';
import type { MapLayers } from '../canvas/layers';

interface AnimatedGraphics {
  water: Graphics;
  lava: Graphics;
  fire: Graphics;
}

const DEFAULT_TILE_SIZE = 24;
const WATER_ACCENT = 0x6cb2e0;
const LAVA_ACCENT = 0xffcc33;
const FIRE_ACCENT = 0xffe066;

interface AnimateOptions {
  tileSize?: number;
}

export function ensureAnimatedGraphics(layers: MapLayers): AnimatedGraphics {
  const parent = layers.animations;
  let water = parent.getChildByLabel('water') as Graphics | null;
  let lava = parent.getChildByLabel('lava') as Graphics | null;
  let fire = parent.getChildByLabel('fire') as Graphics | null;
  if (!water) {
    water = new Graphics();
    water.label = 'water';
    parent.addChild(water);
  }
  if (!lava) {
    lava = new Graphics();
    lava.label = 'lava';
    parent.addChild(lava);
  }
  if (!fire) {
    fire = new Graphics();
    fire.label = 'fire';
    parent.addChild(fire);
  }
  return { water, lava, fire };
}

export function animatePatterns(
  layers: MapLayers,
  dungeon: Dungeon,
  time: number,
  options: AnimateOptions = {},
): void {
  const ts = options.tileSize ?? DEFAULT_TILE_SIZE;
  const g = ensureAnimatedGraphics(layers);
  drawWater(g.water, dungeon, time, ts);
  drawLava(g.lava, dungeon, time, ts);
  drawFire(g.fire, dungeon, time, ts);
}

function drawWater(g: Graphics, d: Dungeon, time: number, ts: number): void {
  g.clear();
  let drew = false;
  const phase = time * 0.0025;
  for (let y = 0; y < d.height; y++) {
    for (let x = 0; x < d.width; x++) {
      if (cellAt(d, x, y) !== CellType.Water) continue;
      drew = true;
      const px = x * ts;
      const py = y * ts;
      const cellPhase = phase + hash2(x, y) * 0.001;
      drawWavy(g, px + ts * 0.15, py + ts * 0.35, ts * 0.7, ts * 0.09, cellPhase);
      drawWavy(g, px + ts * 0.18, py + ts * 0.65, ts * 0.62, ts * 0.07, cellPhase + 1.5);
    }
  }
  if (drew) g.stroke({ width: 1, color: WATER_ACCENT, alpha: 0.75 });
}

function drawWavy(
  g: Graphics,
  x: number,
  y: number,
  length: number,
  amp: number,
  phase: number,
): void {
  const segments = 8;
  g.moveTo(x, y);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    g.lineTo(x + length * t, y + Math.sin(t * Math.PI * 2 + phase) * amp);
  }
}

function drawLava(g: Graphics, d: Dungeon, time: number, ts: number): void {
  g.clear();
  let drew = false;
  for (let y = 0; y < d.height; y++) {
    for (let x = 0; x < d.width; x++) {
      if (cellAt(d, x, y) !== CellType.Lava) continue;
      drew = true;
      const px = x * ts;
      const py = y * ts;
      const seed = hash2(x, y);
      for (let i = 0; i < 3; i++) {
        const rx = ((seed >> (i * 4)) & 0xf) / 16;
        const ry = ((seed >> (i * 4 + 8)) & 0xf) / 16;
        const bubblePhase = time * 0.003 + (seed & 0xff) * 0.05 + i * 1.7;
        const scale = 0.7 + Math.sin(bubblePhase) * 0.3;
        g.circle(
          px + ts * (0.2 + rx * 0.6),
          py + ts * (0.2 + ry * 0.6),
          ts * 0.08 * scale,
        );
      }
    }
  }
  if (drew) g.fill({ color: LAVA_ACCENT, alpha: 0.85 });
}

function drawFire(g: Graphics, d: Dungeon, time: number, ts: number): void {
  g.clear();
  let drew = false;
  for (let y = 0; y < d.height; y++) {
    for (let x = 0; x < d.width; x++) {
      if (cellAt(d, x, y) !== CellType.Fire) continue;
      drew = true;
      const px = x * ts;
      const py = y * ts;
      const seed = hash2(x, y);
      const flicker = Math.sin(time * 0.012 + (seed & 0xff) * 0.05);
      const scale = 0.85 + flicker * 0.15;
      const cx = px + ts / 2;
      const cy = py + ts / 2;
      const wHalf = ts * 0.22 * scale;
      const top = py + ts * (0.18 - flicker * 0.03);
      const bottom = py + ts * 0.85;
      const mid = cy + ts * 0.05;
      g.moveTo(cx, top)
        .lineTo(cx + wHalf, mid)
        .lineTo(cx, bottom)
        .lineTo(cx - wHalf, mid)
        .closePath();
    }
  }
  if (drew) g.fill({ color: FIRE_ACCENT, alpha: 0.9 });
}

function hash2(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

export function clearAnimatedGraphics(layers: MapLayers): void {
  layers.animations.removeChildren();
}
