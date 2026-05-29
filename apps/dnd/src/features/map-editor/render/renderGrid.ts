import { Container, Graphics } from 'pixi.js';

export interface GridOptions {
  tileSize: number;
  width: number;
  height: number;
  color: number;
  alpha: number;
}

const defaultGridOptions: GridOptions = {
  tileSize: 24,
  width: 0,
  height: 0,
  color: 0x000000,
  alpha: 0.15,
};

export function renderGrid(layer: Container, visible: boolean, options: Partial<GridOptions>): void {
  layer.removeChildren();
  if (!visible) return;
  const o: GridOptions = { ...defaultGridOptions, ...options };
  if (o.width <= 0 || o.height <= 0) return;
  const g = new Graphics();
  const w = o.width * o.tileSize;
  const h = o.height * o.tileSize;
  for (let x = 0; x <= o.width; x++) {
    g.moveTo(x * o.tileSize, 0).lineTo(x * o.tileSize, h);
  }
  for (let y = 0; y <= o.height; y++) {
    g.moveTo(0, y * o.tileSize).lineTo(w, y * o.tileSize);
  }
  g.stroke({ width: 1, color: o.color, alpha: o.alpha });
  layer.addChild(g);
}
